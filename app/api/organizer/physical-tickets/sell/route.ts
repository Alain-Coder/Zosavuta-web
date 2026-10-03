import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';
import { sellPhysicalTicket, sellBulkPhysicalTickets } from '@/lib/physical-tickets';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const eventId = Number(body.eventId);
  if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

  // Bulk selling support
  if (body.sellAll || Array.isArray(body.tickets) || Array.isArray(body.ticketIds)) {
    try {
      const ticketsList = Array.isArray(body.tickets) ? body.tickets : Array.isArray(body.ticketIds) ? body.ticketIds : undefined;
      const res = await sellBulkPhysicalTickets({
        eventId,
        ticketNumbersOrIds: ticketsList,
        sellAllAllocated: Boolean(body.sellAll),
        userId: user.uid,
        role: user.role,
      });
      return NextResponse.json({ success: true, count: res.count });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sell tickets';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // Single ticket selling
  const ticket = String(body.ticket || '').trim();
  if (!ticket) return NextResponse.json({ error: 'Event and ticket are required' }, { status: 400 });
  try {
    return NextResponse.json(await sellPhysicalTicket(ticket, eventId, user.uid, user.role));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sell ticket';
    return NextResponse.json({ error: message === 'TICKET_NOT_ALLOCATED' ? 'Ticket is not in allocated status' : message }, { status: message === 'EVENT_NOT_FOUND' ? 404 : 409 });
  }
}