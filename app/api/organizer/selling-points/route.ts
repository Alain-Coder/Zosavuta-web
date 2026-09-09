import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const eventId = Number(new URL(req.url).searchParams.get('eventId'));
  const events = await query('SELECT id FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!events.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json(await query('SELECT id, name, location, contactName, contactPhone FROM selling_points WHERE eventId = ? ORDER BY name', [eventId]));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const eventId = Number(body.eventId);
  const name = String(body.name || '').trim();
  if (!Number.isInteger(eventId) || !name) return NextResponse.json({ error: 'Event and selling point name are required' }, { status: 400 });
  const events = await query('SELECT id FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!events.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const id = `sp_${randomUUID().replace(/-/g, '')}`;
  await query('INSERT INTO selling_points (id, eventId, name, location, contactName, contactPhone) VALUES (?, ?, ?, ?, ?, ?)', [id, eventId, name, body.location || null, body.contactName || null, body.contactPhone || null]);
  return NextResponse.json({ id, name, location: body.location || null }, { status: 201 });
}