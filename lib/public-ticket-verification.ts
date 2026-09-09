import pool from '@/lib/db';

export type PublicTicketResult = {
  ticket: any | null;
  result: 'VALID_ENTRY' | 'ALREADY_USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'NOT_SOLD';
};

export async function verifyPublicTicket(token: string): Promise<PublicTicketResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [digitalRows] = await connection.execute(
      `SELECT t.id, t.ticketNumber, t.status, 'DIGITAL' AS ticketMode,
              o.eventTitle, o.eventDate, o.eventTime, o.eventVenue
       FROM order_tickets t JOIN orders o ON o.id = t.orderId
       WHERE t.verificationToken = ? LIMIT 1 FOR UPDATE`,
      [token]
    );
    const digitalTicket = (digitalRows as any[])[0];
    const ticket = digitalTicket || (await connection.execute(
      `SELECT p.id, p.ticketNumber, p.status, 'PHYSICAL' AS ticketMode,
              e.title AS eventTitle, e.date AS eventDate, e.time AS eventTime, e.venue AS eventVenue
       FROM physical_tickets p JOIN events e ON e.id = p.eventId
       WHERE p.secureToken = ? LIMIT 1 FOR UPDATE`,
      [token]
    ).then(([rows]) => (rows as any[])[0]));

    if (!ticket) {
      await connection.commit();
      return { ticket: null, result: 'INVALID' };
    }

    let result: PublicTicketResult['result'];
    const validStatus = ticket.ticketMode === 'DIGITAL' ? 'VALID' : 'SOLD';
    if (ticket.status === validStatus) {
      const table = ticket.ticketMode === 'DIGITAL' ? 'order_tickets' : 'physical_tickets';
      const usedAtClause = ticket.ticketMode === 'PHYSICAL' ? ', usedAt = CURRENT_TIMESTAMP' : '';
      const [update] = await connection.execute(
        `UPDATE ${table} SET status = 'USED'${usedAtClause} WHERE id = ? AND status = ?`,
        [ticket.id, validStatus]
      );
      result = (update as any).affectedRows === 1 ? 'VALID_ENTRY' : 'ALREADY_USED';
      ticket.status = (update as any).affectedRows === 1 ? 'USED' : ticket.status;
    } else if (ticket.status === 'USED') result = 'ALREADY_USED';
    else if (ticket.status === 'CANCELLED') result = 'CANCELLED';
    else if (ticket.status === 'REFUNDED') result = 'REFUNDED';
    else result = 'NOT_SOLD';

    await connection.commit();
    return { ticket, result };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}