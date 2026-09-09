import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';
import { logFinancialAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!canOrganizeEvents(user)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const eventId = Number((await params).id);
  const events = await query<any>('SELECT * FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!events.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json(events[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!canOrganizeEvents(user)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const eventId = Number((await params).id);
  if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  const current = await query<any>('SELECT * FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!current.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const body = await req.json();
  const allowedStatuses = ['active', 'draft', 'sold_out', 'cancelled'];
  const status = body.status === undefined ? current[0].status : String(body.status);
  if (!allowedStatuses.includes(status)) return NextResponse.json({ error: 'Invalid event status' }, { status: 400 });
  const fields = {
    title: String(body.title ?? current[0].title).trim(),
    description: body.description ?? current[0].description,
    fullDescription: body.fullDescription ?? current[0].fullDescription,
    category: body.category ?? current[0].category,
    date: body.date ?? current[0].date,
    time: body.time ?? current[0].time,
    location: body.location ?? current[0].location,
    venue: body.venue ?? current[0].venue,
    image: body.image ?? current[0].image,
    status,
  };
  if (!fields.title || !fields.date || !fields.time || !fields.location || !fields.venue) return NextResponse.json({ error: 'Title, date, time, location and venue are required' }, { status: 400 });
  await execute(`UPDATE events SET title = ?, description = ?, fullDescription = ?, category = ?, date = ?, time = ?, location = ?, venue = ?, image = ?, status = ? WHERE id = ? AND organizerId = ?`, [fields.title, fields.description, fields.fullDescription, fields.category, fields.date, fields.time, fields.location, fields.venue, fields.image, fields.status, eventId, user.uid]);
  await logFinancialAudit({ actorId: user.uid, actorRole: user.role, action: status === 'cancelled' ? 'EVENT_CANCELLED' : 'EVENT_UPDATED', entityType: 'EVENT', entityId: String(eventId), oldValues: current[0], newValues: fields });
  return NextResponse.json({ success: true, event: { ...current[0], ...fields } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!canOrganizeEvents(user)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const eventId = Number((await params).id);
  const current = await query<any>('SELECT * FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!current.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const orderRows = await query<any>('SELECT COUNT(*) AS count FROM orders WHERE eventId = ?', [eventId]);
  const ticketRows = await query<any>('SELECT COUNT(*) AS count FROM physical_tickets WHERE eventId = ?', [eventId]);
  const hasIssuedHistory = Number(orderRows[0]?.count || 0) > 0 || Number(ticketRows[0]?.count || 0) > 0;
  if (hasIssuedHistory) {
    await execute(`UPDATE events SET status = 'cancelled' WHERE id = ? AND organizerId = ?`, [eventId, user.uid]);
    await logFinancialAudit({ actorId: user.uid, actorRole: user.role, action: 'EVENT_CANCELLED', entityType: 'EVENT', entityId: String(eventId), oldValues: current[0], newValues: { status: 'cancelled' } });
    return NextResponse.json({ success: true, cancelled: true, message: 'Event had ticket history and was cancelled instead of deleted.' });
  }
  await execute('DELETE FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  await logFinancialAudit({ actorId: user.uid, actorRole: user.role, action: 'EVENT_DELETED', entityType: 'EVENT', entityId: String(eventId), oldValues: current[0], newValues: null });
  return NextResponse.json({ success: true, deleted: true });
}