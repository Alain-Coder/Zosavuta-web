import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';
import { scanPhysicalTicket } from '@/lib/physical-tickets';

const messages: Record<string, string> = {
  VALID_ENTRY: 'VALID TICKET - ENTRY ALLOWED',
  ALREADY_USED: 'TICKET ALREADY USED - ENTRY DENIED',
  NOT_SOLD: 'TICKET NOT SOLD YET - ENTRY DENIED',
  WRONG_EVENT: 'WRONG EVENT - ENTRY DENIED',
  CANCELLED: 'CANCELLED TICKET - ENTRY DENIED',
  REFUNDED: 'REFUNDED TICKET - ENTRY DENIED',
  INVALID: 'INVALID TICKET - ENTRY DENIED',
};

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
  const body = await req.json();
  const eventId = Number(body.eventId);
  const token = String(body.token || '').trim().replace(/^.*\/tickets\/verify\//, '');
  if (!Number.isInteger(eventId) || !token) return NextResponse.json({ error: 'Event and secure ticket token are required' }, { status: 400 });
  try {
    const scan = await scanPhysicalTicket(token, eventId, user.uid, user.role, req.headers.get('user-agent') || undefined);
    return NextResponse.json({ ...scan, message: messages[scan.result] || messages.INVALID }, { status: scan.result === 'VALID_ENTRY' ? 200 : 422 });
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to verify ticket' }, { status: 500 });
  }
}