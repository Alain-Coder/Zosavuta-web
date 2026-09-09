import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';
import { generatePhysicalTickets } from '@/lib/physical-tickets';

function forbidden() {
  return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return forbidden();
  const eventId = Number(new URL(req.url).searchParams.get('eventId'));
  if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'A valid eventId is required' }, { status: 400 });

  const events = await query<any>('SELECT id, title, ticketsTotal, ticketsAvailable, organizerId FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!events.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const [counts, tickets] = await Promise.all([
    query<any>(`SELECT
      SUM(status = 'ALLOCATED') allocated,
      SUM(status = 'SOLD') sold,
      SUM(status = 'USED') used,
      SUM(status = 'AVAILABLE') returned
      FROM physical_tickets WHERE eventId = ?`, [eventId]),
    query<any>(`SELECT id, ticketNumber, ticketType, price, status, secureToken, sellingPointId, allocatedAt, soldAt, usedAt
      FROM physical_tickets WHERE eventId = ? ORDER BY createdAt DESC LIMIT 500`, [eventId]),
  ]);
  return NextResponse.json({
    event: events[0],
    inventory: { total: Number(events[0].ticketsTotal), available: Number(events[0].ticketsAvailable), allocated: Number(counts[0]?.allocated || 0), sold: Number(counts[0]?.sold || 0), used: Number(counts[0]?.used || 0), returned: Number(counts[0]?.returned || 0) },
    tickets,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return forbidden();
  const body = await req.json();
  const eventId = Number(body.eventId);
  const quantity = Number(body.quantity);
  if (!Number.isInteger(eventId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    return NextResponse.json({ error: 'Quantity must be a whole number between 1 and 10,000' }, { status: 400 });
  }
  try {
    const result = await generatePhysicalTickets({ eventId, quantity, userId: user.uid, role: user.role, ticketType: String(body.ticketType || 'Regular') });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate tickets';
    const status = message === 'INSUFFICIENT_INVENTORY' ? 409 : message === 'EVENT_NOT_FOUND' ? 404 : message === 'EVENT_NOT_ACTIVE' ? 400 : 500;
    return NextResponse.json({ error: message === 'INSUFFICIENT_INVENTORY' ? 'Requested quantity exceeds available inventory' : message }, { status });
  }
}