import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const eventId = Number(body.eventId);
  const ticket = String(body.ticket || '').trim();
  const sellingPointId = String(body.sellingPointId || '').trim();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [events] = await connection.execute('SELECT id FROM events WHERE id = ? AND organizerId = ? FOR UPDATE', [eventId, user.uid]);
    if (!(events as any[]).length) { await connection.rollback(); return NextResponse.json({ error: 'Event not found' }, { status: 404 }); }
    const [points] = await connection.execute('SELECT id FROM selling_points WHERE id = ? AND eventId = ?', [sellingPointId, eventId]);
    if (!(points as any[]).length) { await connection.rollback(); return NextResponse.json({ error: 'Selling point not found' }, { status: 404 }); }
    const [result] = await connection.execute(`UPDATE physical_tickets SET sellingPointId = ? WHERE eventId = ? AND (id = ? OR ticketNumber = ?) AND status = 'ALLOCATED'`, [sellingPointId, eventId, ticket, ticket]);
    if ((result as any).affectedRows !== 1) { await connection.rollback(); return NextResponse.json({ error: 'Only allocated tickets can be assigned' }, { status: 409 }); }
    const [updated] = await connection.execute('SELECT id FROM physical_tickets WHERE eventId = ? AND (id = ? OR ticketNumber = ?) LIMIT 1', [eventId, ticket, ticket]);
    await connection.execute('UPDATE ticket_allocations SET sellingPointId = ? WHERE ticketId = ? AND status = \'ALLOCATED\'', [sellingPointId, (updated as any[])[0].id]);
    await connection.commit();
    return NextResponse.json({ assigned: true });
  } catch { await connection.rollback(); return NextResponse.json({ error: 'Unable to assign ticket' }, { status: 500 }); }
  finally { connection.release(); }
}