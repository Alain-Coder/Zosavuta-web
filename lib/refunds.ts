import pool, { query } from '@/lib/db';
import { calculateRefundFees } from '@/lib/fees';
import { logFinancialAudit } from '@/lib/audit';

export async function processTicketRefund(
  ticketId: number,
  reason: string,
  adminId: string,
  adminRole: string = 'ACCOUNTANT'
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ticketRows] = await conn.execute(
      'SELECT id, orderId, ticketNumber, currentOwnerId, status FROM order_tickets WHERE id = ? FOR UPDATE',
      [ticketId]
    );
    const ticket = (ticketRows as any[])[0];
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'REFUNDED') throw new Error('Ticket has already been refunded');

    const [orderRows] = await conn.execute(
      'SELECT id, userId, eventId, price, quantity, totalAmount, paymentStatus FROM orders WHERE id = ? FOR UPDATE',
      [ticket.orderId]
    );
    const order = (orderRows as any[])[0];
    if (!order) throw new Error('Order not found');

    const [eventRows] = await conn.execute('SELECT organizerId FROM events WHERE id = ?', [order.eventId]);
    const organizerId = (eventRows as any[])[0]?.organizerId;

    const singleTicketAmount = order.quantity > 0 ? Number(order.price) : Number(order.totalAmount);
    const feeCalculation = await calculateRefundFees(singleTicketAmount);

    // Update ticket status
    await conn.execute(`UPDATE order_tickets SET status = 'REFUNDED' WHERE id = ?`, [ticketId]);

    // Check remaining valid tickets on order
    const [validTicketsRows] = await conn.execute(
      'SELECT COUNT(*) as count FROM order_tickets WHERE orderId = ? AND status = \'VALID\'',
      [ticket.orderId]
    );
    const validCount = Number((validTicketsRows as any[])[0]?.count || 0);

    const newPaymentStatus = validCount === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await conn.execute(`UPDATE orders SET paymentStatus = ? WHERE id = ?`, [newPaymentStatus, order.orderId || order.id]);

    // Restock ticket availability
    await conn.execute('UPDATE events SET ticketsAvailable = ticketsAvailable + 1 WHERE id = ?', [order.eventId]);

    // Record reversal ledger entries
    if (organizerId) {
      await conn.execute(
        `INSERT INTO financial_ledger (sellerId, buyerId, eventId, ticketId, orderId, transactionType, amount, status, description)
         VALUES (?, ?, ?, ?, ?, 'REFUND', ?, 'COMPLETED', ?)`,
        [organizerId, ticket.currentOwnerId, order.eventId, ticketId, order.id, feeCalculation.netRefundAmount, `Refund processed: ${reason}`]
      );

      await conn.execute(
        `UPDATE seller_balances 
         SET pendingBalance = GREATEST(0, pendingBalance - ?),
             availableBalance = GREATEST(0, availableBalance - ?)
         WHERE sellerId = ?`,
        [feeCalculation.netRefundAmount, feeCalculation.netRefundAmount, organizerId]
      );
    }

    // Log immutable audit record
    await logFinancialAudit(
      {
        actorId: adminId,
        actorRole: adminRole,
        action: 'TICKET_REFUND',
        entityType: 'TICKET',
        entityId: String(ticketId),
        oldValues: { status: ticket.status },
        newValues: { status: 'REFUNDED', reason, netRefundAmount: feeCalculation.netRefundAmount },
      },
      conn
    );

    await conn.commit();
    return { success: true, ticketId, status: 'REFUNDED', refundAmount: feeCalculation.netRefundAmount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function processEventCancellation(
  eventId: number,
  reason: string,
  adminId: string,
  adminRole: string = 'SYSTEM_ADMINISTRATOR'
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [eventRows] = await conn.execute('SELECT id, title, organizerId, status FROM events WHERE id = ? FOR UPDATE', [eventId]);
    const event = (eventRows as any[])[0];
    if (!event) throw new Error('Event not found');

    await conn.execute(`UPDATE events SET status = 'cancelled' WHERE id = ?`, [eventId]);

    // Fetch all tickets for event
    const [tickets] = await conn.execute(
      `SELECT t.id FROM order_tickets t JOIN orders o ON t.orderId = o.id WHERE o.eventId = ? AND t.status = 'VALID'`,
      [eventId]
    );

    let refundedTicketsCount = 0;
    for (const t of tickets as { id: number }[]) {
      try {
        await processTicketRefund(t.id, `Event Cancelled: ${reason}`, adminId, adminRole);
        refundedTicketsCount += 1;
      } catch (refundErr) {
        console.warn(`Failed refunding ticket ${t.id} during event cancellation:`, refundErr);
      }
    }

    // Block organizer payouts for this event
    await conn.execute(`UPDATE orders SET payoutStatus = 'BLOCKED' WHERE eventId = ?`, [eventId]);

    await logFinancialAudit(
      {
        actorId: adminId,
        actorRole: adminRole,
        action: 'EVENT_CANCELLATION',
        entityType: 'EVENT',
        entityId: String(eventId),
        oldValues: { status: event.status },
        newValues: { status: 'cancelled', reason, refundedTicketsCount },
      },
      conn
    );

    await conn.commit();
    return { success: true, eventId, refundedTicketsCount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function processChargeback(
  paymentId: string,
  reason: string,
  adminId: string,
  adminRole: string = 'ACCOUNTANT'
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [paymentRows] = await conn.execute('SELECT id, orderId, amount, status FROM payments WHERE id = ? FOR UPDATE', [paymentId]);
    const payment = (paymentRows as any[])[0];
    if (!payment) throw new Error('Payment not found');

    const [orderRows] = await conn.execute('SELECT id, userId, eventId FROM orders WHERE id = ?', [payment.orderId]);
    const order = (orderRows as any[])[0];

    const [eventRows] = await conn.execute('SELECT organizerId FROM events WHERE id = ?', [order?.eventId]);
    const organizerId = (eventRows as any[])[0]?.organizerId;

    await conn.execute(`UPDATE payments SET status = 'REFUNDED' WHERE id = ?`, [paymentId]);
    await conn.execute(`UPDATE orders SET paymentStatus = 'REFUNDED', payoutStatus = 'BLOCKED' WHERE id = ?`, [payment.orderId]);

    // Revoke associated tickets
    await conn.execute(`UPDATE order_tickets SET status = 'CANCELLED' WHERE orderId = ?`, [payment.orderId]);

    if (organizerId) {
      await conn.execute(
        `INSERT INTO financial_ledger (sellerId, buyerId, eventId, orderId, paymentId, transactionType, amount, status, description)
         VALUES (?, ?, ?, ?, ?, 'CHARGEBACK', ?, 'COMPLETED', ?)`,
        [organizerId, order?.userId, order?.eventId, payment.orderId, paymentId, payment.amount, `Dispute/Chargeback: ${reason}`]
      );

      await conn.execute(
        `UPDATE seller_balances 
         SET pendingBalance = GREATEST(0, pendingBalance - ?),
             availableBalance = GREATEST(0, availableBalance - ?)
         WHERE sellerId = ?`,
        [payment.amount, payment.amount, organizerId]
      );
    }

    await logFinancialAudit(
      {
        actorId: adminId,
        actorRole: adminRole,
        action: 'CHARGEBACK_PROCESSED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        oldValues: { status: payment.status },
        newValues: { status: 'REFUNDED', chargebackAmount: payment.amount, reason },
      },
      conn
    );

    await conn.commit();
    return { success: true, paymentId, chargebackAmount: payment.amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
