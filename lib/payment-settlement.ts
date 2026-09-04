import pool from '@/lib/db';
import { calculatePrimaryOrderFees, calculateResaleFees } from '@/lib/fees';
import { recordTicketOwnershipHistory } from '@/lib/tickets';

export async function completeVerifiedPayment(paymentId: string, orderId: string, providerReference: string) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [paymentRows] = await conn.execute('SELECT id, status, amount FROM payments WHERE id = ? FOR UPDATE', [paymentId]);
    const payment = (paymentRows as { id: string; status: string; amount: number }[])[0];
    if (!payment) throw new Error('Payment record not found');

    if (payment.status === 'PAID') {
      await conn.commit();
      return;
    }

    await conn.execute(
      `UPDATE payments SET status = 'PAID', providerReference = ? WHERE id = ?`,
      [providerReference, paymentId]
    );

    const [orderRows] = await conn.execute(
      'SELECT id, userId, eventId, quantity, price, totalAmount, tier FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );
    const order = (orderRows as { id: string; userId: string; eventId: number; quantity: number; price: number; totalAmount: number; tier: string }[])[0];
    if (!order) throw new Error('Order record not found');

    await conn.execute(
      `UPDATE orders SET status = 'confirmed', paymentStatus = 'PAID', providerReference = ? WHERE id = ?`,
      [providerReference, orderId]
    );

    // Check if this order is a Secondary Resale purchase
    const [resaleRows] = await conn.execute(
      'SELECT id, ticketId, sellerId, price FROM resale_listings WHERE (reservedBy = ? OR id = ?) AND status IN (\'ACTIVE\', \'RESERVED\') LIMIT 1 FOR UPDATE',
      [order.userId, order.tier]
    );
    const resaleListing = (resaleRows as { id: string; ticketId: number; sellerId: string; price: number }[])[0];

    if (resaleListing) {
      // ─── SECONDARY RESALE FINALIZATION ───
      await conn.execute(
        `UPDATE resale_listings SET status = 'SOLD', soldAt = NOW() WHERE id = ?`,
        [resaleListing.id]
      );

      await conn.execute(
        `UPDATE order_tickets SET currentOwnerId = ?, listedForResale = 0 WHERE id = ?`,
        [order.userId, resaleListing.ticketId]
      );

      await recordTicketOwnershipHistory(
        resaleListing.ticketId,
        resaleListing.sellerId,
        order.userId,
        orderId,
        resaleListing.id,
        conn
      );

      const feeBreakdown = await calculateResaleFees(resaleListing.price);

      await conn.execute(
        `INSERT IGNORE INTO financial_ledger 
         (sellerId, buyerId, eventId, ticketId, orderId, resaleListingId, paymentId, transactionType, amount, status, providerReference, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SECONDARY_TICKET_SALE', ?, 'PENDING', ?, 'Verified secondary ticket resale')`,
        [resaleListing.sellerId, order.userId, order.eventId, resaleListing.ticketId, orderId, resaleListing.id, paymentId, feeBreakdown.netResellerEarnings, providerReference]
      );

      await conn.execute(
        `INSERT IGNORE INTO financial_ledger 
         (sellerId, buyerId, eventId, ticketId, orderId, resaleListingId, paymentId, transactionType, amount, status, providerReference, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SECONDARY_RESELLER_FEE', ?, 'COMPLETED', ?, 'Resale platform commission fee')`,
        [resaleListing.sellerId, order.userId, order.eventId, resaleListing.ticketId, orderId, resaleListing.id, paymentId, feeBreakdown.platformCommission, providerReference]
      );

      await conn.execute(
        `INSERT INTO seller_balances (sellerId, pendingBalance, availableBalance, paidOutBalance)
         VALUES (?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE pendingBalance = pendingBalance + ?`,
        [resaleListing.sellerId, feeBreakdown.netResellerEarnings, feeBreakdown.netResellerEarnings]
      );

    } else {
      // ─── PRIMARY TICKET FINALIZATION ───
      const [ticketCountRows] = await conn.execute('SELECT COUNT(*) AS count FROM order_tickets WHERE orderId = ?', [orderId]);
      const ticketCount = Number((ticketCountRows as { count: number }[])[0].count);

      const [eventRows] = await conn.execute('SELECT organizerId FROM events WHERE id = ?', [order.eventId]);
      const organizerId = (eventRows as { organizerId: string }[])[0]?.organizerId;

      for (let index = ticketCount; index < order.quantity; index += 1) {
        const ticketNumber = `TK-${orderId.slice(-8)}-${index + 1}`;
        const [ticketResult] = await conn.execute(
          'INSERT INTO order_tickets (orderId, ticketNumber, currentOwnerId, status) VALUES (?, ?, ?, \'VALID\')',
          [orderId, ticketNumber, order.userId]
        );
        const insertedTicketId = (ticketResult as any).insertId;

        if (insertedTicketId) {
          await recordTicketOwnershipHistory(
            insertedTicketId,
            null,
            order.userId,
            orderId,
            null,
            conn
          );
        }
      }

      await conn.execute(
        'UPDATE events SET ticketsAvailable = ticketsAvailable - ? WHERE id = ? AND ticketsAvailable >= ?',
        [order.quantity, order.eventId, order.quantity]
      );

      const fees = await calculatePrimaryOrderFees(order.price, order.quantity);

      if (organizerId) {
        await conn.execute(
          `INSERT IGNORE INTO financial_ledger 
           (sellerId, buyerId, eventId, orderId, paymentId, transactionType, amount, status, providerReference, description)
           VALUES (?, ?, ?, ?, ?, 'PRIMARY_TICKET_SALE', ?, 'PENDING', ?, 'Verified primary ticket sale')`,
          [organizerId, order.userId, order.eventId, orderId, paymentId, fees.netOrganizerEarnings, providerReference]
        );

        await conn.execute(
          `INSERT IGNORE INTO financial_ledger 
           (sellerId, buyerId, eventId, orderId, paymentId, transactionType, amount, status, providerReference, description)
           VALUES (?, ?, ?, ?, ?, 'PLATFORM_FEE', ?, 'COMPLETED', ?, 'Platform commission fee')`,
          [organizerId, order.userId, order.eventId, orderId, paymentId, fees.platformCommission, providerReference]
        );

        await conn.execute(
          `INSERT INTO seller_balances (sellerId, pendingBalance, availableBalance, paidOutBalance)
           VALUES (?, ?, 0, 0)
           ON DUPLICATE KEY UPDATE pendingBalance = pendingBalance + ?`,
          [organizerId, fees.netOrganizerEarnings, fees.netOrganizerEarnings]
        );
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}