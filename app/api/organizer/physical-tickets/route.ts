import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { canOrganize } from '@/lib/roles';
import { generatePhysicalTickets } from '@/lib/physical-tickets';
import { checkOrganizerIsApproved } from '@/lib/organizer-verification';

function forbidden() {
  return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return forbidden();

  const eventIdParam = new URL(req.url).searchParams.get('eventId');
  if (!eventIdParam) {
    const [counts, byEvent, returnedLog] = await Promise.all([
      query<any>(
        `SELECT
          COALESCE(SUM(pt.status = 'ALLOCATED'), 0) AS allocated,
          COALESCE(SUM(pt.status = 'SOLD'), 0) AS sold,
          COALESCE(SUM(pt.status = 'USED'), 0) AS used,
          COUNT(pt.id) AS total,
          COALESCE(SUM(CASE WHEN pt.status IN ('SOLD', 'USED') THEN pt.price ELSE 0 END), 0) AS soldRevenue
        FROM physical_tickets pt
        JOIN events e ON e.id = pt.eventId
        WHERE e.organizerId = ?`,
        [user.uid]
      ),
      query<any>(
        `SELECT
          pt.eventId,
          COALESCE(SUM(pt.status = 'ALLOCATED'), 0) AS allocated,
          COALESCE(SUM(pt.status = 'SOLD'), 0) AS sold,
          COALESCE(SUM(pt.status = 'USED'), 0) AS used,
          COUNT(pt.id) AS total,
          COALESCE(SUM(CASE WHEN pt.status IN ('SOLD', 'USED') THEN pt.price ELSE 0 END), 0) AS soldRevenue
        FROM physical_tickets pt
        JOIN events e ON e.id = pt.eventId
        WHERE e.organizerId = ?
        GROUP BY pt.eventId`,
        [user.uid]
      ),
      // Count destroyed/returned tickets from audit log (they are deleted from physical_tickets)
      query<any>(
        `SELECT tal.eventId, COUNT(*) AS returned
         FROM ticket_audit_logs tal
         JOIN events e ON e.id = tal.eventId
         WHERE e.organizerId = ? AND tal.action = 'TICKET_RETURNED_DESTROYED'
         GROUP BY tal.eventId`,
        [user.uid]
      ),
    ]);

    const returnedByEvent: Record<string, number> = {};
    for (const row of returnedLog) {
      returnedByEvent[String(row.eventId)] = Number(row.returned || 0);
    }
    const totalReturned = Object.values(returnedByEvent).reduce((sum, n) => sum + n, 0);

    const byEventMap: Record<string, { allocated: number; sold: number; used: number; returned: number; total: number; soldRevenue: number }> = {};
    for (const row of byEvent) {
      byEventMap[String(row.eventId)] = {
        allocated: Number(row.allocated || 0),
        sold: Number(row.sold || 0),
        used: Number(row.used || 0),
        returned: returnedByEvent[String(row.eventId)] || 0,
        total: Number(row.total || 0),
        soldRevenue: Number(row.soldRevenue || 0),
      };
    }

    return NextResponse.json({
      summary: {
        allocated: Number(counts[0]?.allocated || 0),
        sold: Number(counts[0]?.sold || 0),
        used: Number(counts[0]?.used || 0),
        returned: totalReturned,
        total: Number(counts[0]?.total || 0),
        soldRevenue: Number(counts[0]?.soldRevenue || 0),
      },
      byEvent: byEventMap,
    });
  }

  const eventId = Number(eventIdParam);
  if (!Number.isInteger(eventId)) return NextResponse.json({ error: 'A valid eventId is required' }, { status: 400 });

  const events = await query<any>('SELECT id, title, ticketsTotal, ticketsAvailable, organizerId FROM events WHERE id = ? AND organizerId = ?', [eventId, user.uid]);
  if (!events.length) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const [counts, tickets, returnedRows] = await Promise.all([
    query<any>(`SELECT
      SUM(status = 'ALLOCATED') allocated,
      SUM(status = 'SOLD') sold,
      SUM(status = 'USED') used
      FROM physical_tickets WHERE eventId = ?`, [eventId]),
    query<any>(`SELECT id, ticketNumber, ticketType, price, status, secureToken, sellingPointId, allocatedAt, soldAt, usedAt
      FROM physical_tickets WHERE eventId = ? ORDER BY createdAt DESC LIMIT 500`, [eventId]),
    // Count returned/destroyed tickets from audit log (they are deleted from physical_tickets)
    query<any>(`SELECT COUNT(*) AS returned FROM ticket_audit_logs WHERE eventId = ? AND action = 'TICKET_RETURNED_DESTROYED'`, [eventId]),
  ]);
  const returned = Number(returnedRows[0]?.returned || 0);
  return NextResponse.json({
    event: events[0],
    inventory: { total: Number(events[0].ticketsTotal), available: Number(events[0].ticketsAvailable), allocated: Number(counts[0]?.allocated || 0), sold: Number(counts[0]?.sold || 0), used: Number(counts[0]?.used || 0), returned },
    tickets,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || !canOrganize(user.role)) return forbidden();

  const isApproved = await checkOrganizerIsApproved(user.uid);
  if (!isApproved) {
    return NextResponse.json(
      { error: 'Organizer verification required. Your account must be verified and approved before generating physical selling-point tickets.' },
      { status: 403 }
    );
  }

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