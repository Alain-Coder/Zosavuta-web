import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';
import { returnPhysicalTicket } from '@/lib/physical-tickets';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const eventId = Number(body.eventId);
  const ticket = String(body.ticket || '').trim();
  if (!Number.isInteger(eventId) || !ticket) return NextResponse.json({ error: 'Event and ticket are required' }, { status: 400 });
  try {
    return NextResponse.json(await returnPhysicalTicket(ticket, eventId, user.uid, user.role));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to return ticket';
    return NextResponse.json({ error: message === 'TICKET_NOT_RETURNABLE' ? 'Only allocated tickets can be returned' : message }, { status: message === 'EVENT_NOT_FOUND' ? 404 : 409 });
  }
}