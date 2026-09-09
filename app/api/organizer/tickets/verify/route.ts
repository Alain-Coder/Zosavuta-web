import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const token = String(body.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Secure ticket token is required' }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT t.id, t.ticketNumber, t.status, o.tier AS ticketType, o.eventId, o.eventTitle, o.eventDate, o.eventTime, o.eventVenue
       FROM order_tickets t JOIN orders o ON o.id = t.orderId
       JOIN events e ON e.id = o.eventId
       WHERE t.verificationToken = ? AND e.organizerId = ? LIMIT 1 FOR UPDATE`,
      [token, user.uid]
    );
    const ticket = (rows as any[])[0];
    if (!ticket) { await connection.rollback(); return NextResponse.json({ error: 'Ticket not found or event access denied' }, { status: 404 }); }
    let result = ticket.status === 'VALID' ? 'VALID_ENTRY' : ticket.status === 'USED' ? 'ALREADY_USED' : ticket.status === 'REFUNDED' ? 'REFUNDED' : ticket.status === 'CANCELLED' ? 'CANCELLED' : 'NOT_SOLD';
    if (result === 'VALID_ENTRY') {
      const [updated] = await connection.execute(`UPDATE order_tickets SET status = 'USED' WHERE id = ? AND status = 'VALID'`, [ticket.id]);
      if ((updated as any).affectedRows !== 1) result = 'ALREADY_USED';
      else ticket.status = 'USED';
    }
    await connection.commit();
    return NextResponse.json({ result, ticket, message: result === 'VALID_ENTRY' ? 'VALID TICKET - ENTRY ALLOWED' : `${result.replace('_', ' ')} - ENTRY DENIED` }, { status: result === 'VALID_ENTRY' ? 200 : 422 });
  } catch {
    await connection.rollback();
    return NextResponse.json({ error: 'Unable to verify ticket' }, { status: 500 });
  } finally { connection.release(); }
}