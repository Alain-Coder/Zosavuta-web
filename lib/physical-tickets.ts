import { randomBytes, randomUUID } from 'crypto';
import pool, { PoolConnection } from '@/lib/db';

export const PHYSICAL_TICKET_ROLES = ['organizer', 'customer_organizer'] as const;

export type PhysicalTicketStatus = 'AVAILABLE' | 'ALLOCATED' | 'SOLD' | 'USED' | 'CANCELLED' | 'REFUNDED';

function ticketNumber(eventId: number, index: number): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `EVT-${eventId}-${String(index + 1).padStart(5, '0')}-${suffix}`;
}

function ticketId(): string {
  return `pt_${randomUUID().replace(/-/g, '')}`;
}

export async function ownsEvent(connection: PoolConnection, eventId: number, userId: string) {
  const [rows] = await connection.execute(
    'SELECT id, title, date, time, location, venue, image, price, ticketsTotal, ticketsAvailable, status FROM events WHERE id = ? AND organizerId = ? FOR UPDATE',
    [eventId, userId]
  );
  return (rows as any[])[0] || null;
}

export async function generatePhysicalTickets({
  eventId,
  quantity,
  userId,
  role,
  ticketType = 'Regular',
}: {
  eventId: number;
  quantity: number;
  userId: string;
  role: string;
  ticketType?: string;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const event = await ownsEvent(connection, eventId, userId);
    if (!event) throw new Error('EVENT_NOT_FOUND');
    if (event.status !== 'active') throw new Error('EVENT_NOT_ACTIVE');
    if (Number(event.ticketsAvailable) < quantity) throw new Error('INSUFFICIENT_INVENTORY');

    const tickets: Array<Record<string, unknown>> = [];
    for (let index = 0; index < quantity; index += 1) {
      const id = ticketId();
      const secureToken = randomBytes(32).toString('hex');
      const number = ticketNumber(eventId, index);
      await connection.execute(
        `INSERT INTO physical_tickets (id, eventId, ticketNumber, secureToken, ticketType, price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ALLOCATED')`,
        [id, eventId, number, secureToken, ticketType, event.price]
      );
      await connection.execute(
        'INSERT INTO ticket_allocations (eventId, ticketId, status) VALUES (?, ?, \'ALLOCATED\')',
        [eventId, id]
      );
      tickets.push({
        id,
        ticketNumber: number,
        secureToken,
        verificationUrl: `/tickets/verify/${secureToken}`,
        ticketType,
        price: Number(event.price),
        status: 'ALLOCATED',
      });
    }

    await connection.execute(
      'UPDATE events SET ticketsAvailable = ticketsAvailable - ? WHERE id = ? AND ticketsAvailable >= ?',
      [quantity, eventId, quantity]
    );
    await connection.execute(
      `INSERT INTO ticket_audit_logs (actorId, actorRole, action, eventId, metadata)
       VALUES (?, ?, 'TICKETS_GENERATED', ?, ?)`,
      [userId, role, eventId, JSON.stringify({ quantity, ticketType })]
    );
    await connection.commit();
    return { event, tickets };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function sellPhysicalTicket(ticketIdOrNumber: string, eventId: number, userId: string, role: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const event = await ownsEvent(connection, eventId, userId);
    if (!event) throw new Error('EVENT_NOT_FOUND');
    const [result] = await connection.execute(
      `UPDATE physical_tickets SET status = 'SOLD', soldAt = CURRENT_TIMESTAMP
       WHERE eventId = ? AND (id = ? OR ticketNumber = ?) AND status = 'ALLOCATED'`,
      [eventId, ticketIdOrNumber, ticketIdOrNumber]
    );
    if ((result as any).affectedRows !== 1) throw new Error('TICKET_NOT_ALLOCATED');
    const [rows] = await connection.execute(
      'SELECT id, ticketNumber, status FROM physical_tickets WHERE eventId = ? AND (id = ? OR ticketNumber = ?) LIMIT 1',
      [eventId, ticketIdOrNumber, ticketIdOrNumber]
    );
    const ticket = (rows as any[])[0];
    await connection.execute(
      `INSERT INTO ticket_audit_logs (actorId, actorRole, action, eventId, ticketId, metadata)
       VALUES (?, ?, 'TICKET_SOLD', ?, ?, ?)`,
      [userId, role, eventId, ticket.id, JSON.stringify({ ticketNumber: ticket.ticketNumber })]
    );
    await connection.commit();
    return ticket;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function sellBulkPhysicalTickets({
  eventId,
  ticketNumbersOrIds,
  sellAllAllocated = false,
  userId,
  role,
}: {
  eventId: number;
  ticketNumbersOrIds?: string[];
  sellAllAllocated?: boolean;
  userId: string;
  role: string;
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const event = await ownsEvent(connection, eventId, userId);
    if (!event) throw new Error('EVENT_NOT_FOUND');

    let affectedRows = 0;
    if (sellAllAllocated) {
      const [result] = await connection.execute(
        `UPDATE physical_tickets SET status = 'SOLD', soldAt = CURRENT_TIMESTAMP
         WHERE eventId = ? AND status = 'ALLOCATED'`,
        [eventId]
      );
      affectedRows = (result as any).affectedRows || 0;
    } else if (ticketNumbersOrIds && ticketNumbersOrIds.length > 0) {
      const placeholders = ticketNumbersOrIds.map(() => '?').join(',');
      const [result] = await connection.execute(
        `UPDATE physical_tickets SET status = 'SOLD', soldAt = CURRENT_TIMESTAMP
         WHERE eventId = ? AND status = 'ALLOCATED' AND (id IN (${placeholders}) OR ticketNumber IN (${placeholders}))`,
        [eventId, ...ticketNumbersOrIds, ...ticketNumbersOrIds]
      );
      affectedRows = (result as any).affectedRows || 0;
    }

    await connection.execute(
      `INSERT INTO ticket_audit_logs (actorId, actorRole, action, eventId, metadata)
       VALUES (?, ?, 'BULK_TICKETS_SOLD', ?, ?)`,
      [userId, role, eventId, JSON.stringify({ count: affectedRows, sellAllAllocated })]
    );

    await connection.commit();
    return { count: affectedRows };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function returnPhysicalTicket(ticketIdOrNumber: string, eventId: number, userId: string, role: string) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const event = await ownsEvent(connection, eventId, userId);
    if (!event) throw new Error('EVENT_NOT_FOUND');
    const [rows] = await connection.execute(
      'SELECT id, ticketNumber, status FROM physical_tickets WHERE eventId = ? AND (id = ? OR ticketNumber = ?) LIMIT 1',
      [eventId, ticketIdOrNumber, ticketIdOrNumber]
    );
    const ticket = (rows as any[])[0];
    if (!ticket) throw new Error('TICKET_NOT_FOUND');
    if (ticket.status !== 'ALLOCATED') throw new Error('TICKET_NOT_RETURNABLE');

    // Completely DELETE (destroy) the returned ticket so it is removed from system
    await connection.execute(
      `DELETE FROM physical_tickets WHERE id = ? AND eventId = ? AND status = 'ALLOCATED'`,
      [ticket.id, eventId]
    );
    await connection.execute('UPDATE events SET ticketsAvailable = ticketsAvailable + 1 WHERE id = ?', [eventId]);
    await connection.execute(
      `INSERT INTO ticket_audit_logs (actorId, actorRole, action, eventId, metadata)
       VALUES (?, ?, 'TICKET_RETURNED_DESTROYED', ?, ?)`,
      [userId, role, eventId, JSON.stringify({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber })]
    );
    await connection.commit();
    return { id: ticket.id, ticketNumber: ticket.ticketNumber, destroyed: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function scanPhysicalTicket(token: string, eventId: number, userId: string, role: string, deviceInfo?: string) {
  const connection = await pool.getConnection();
  let result = 'INVALID';
  let ticket: any = null;
  try {
    await connection.beginTransaction();
    const [eventRows] = await connection.execute(
      'SELECT id FROM events WHERE id = ? AND organizerId = ? FOR UPDATE',
      [eventId, userId]
    );
    if (!(eventRows as any[]).length) throw new Error('EVENT_NOT_FOUND');
    const [rows] = await connection.execute(
      `SELECT id, eventId, ticketNumber, ticketType, status
       FROM physical_tickets WHERE secureToken = ? LIMIT 1`,
      [token]
    );
    ticket = (rows as any[])[0] || null;
    if (ticket && Number(ticket.eventId) !== eventId) result = 'WRONG_EVENT';
    else if (ticket?.status === 'USED') result = 'ALREADY_USED';
    else if (ticket?.status === 'ALLOCATED' || ticket?.status === 'AVAILABLE') result = 'NOT_SOLD';
    else if (ticket?.status === 'CANCELLED') result = 'CANCELLED';
    else if (ticket?.status === 'REFUNDED') result = 'REFUNDED';
    else if (ticket?.status === 'SOLD') {
      const [update] = await connection.execute(
        `UPDATE physical_tickets SET status = 'USED', usedAt = CURRENT_TIMESTAMP
         WHERE id = ? AND eventId = ? AND status = 'SOLD'`,
        [ticket.id, eventId]
      );
      result = (update as any).affectedRows === 1 ? 'VALID_ENTRY' : 'ALREADY_USED';
    }
    await connection.execute(
      `INSERT INTO ticket_scans (ticketId, eventId, scannedBy, deviceInfo, result)
       VALUES (?, ?, ?, ?, ?)`,
      [ticket?.id || null, eventId, userId, deviceInfo || null, result]
    );
    await connection.execute(
      `INSERT INTO ticket_audit_logs (actorId, actorRole, action, eventId, ticketId, metadata)
       VALUES (?, ?, 'TICKET_SCANNED', ?, ?, ?)`,
      [userId, role, eventId, ticket?.id || null, JSON.stringify({ result, deviceInfo: deviceInfo || null })]
    );
    await connection.commit();
    return { result, ticket };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}