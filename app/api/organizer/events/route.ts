import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!canOrganizeEvents(user)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });

  // Auto-complete: mark active events whose date+time has passed as 'completed'
  // (excludes sold_out and cancelled — those keep their own status)
  await execute(
    `UPDATE events
     SET status = 'completed'
     WHERE organizerId = ?
     AND (status = 'active' OR status = '' OR status IS NULL)
     AND TIMESTAMP(date, time) < NOW()`,
    [user.uid]
  );

  const events = await query<any>(
    `SELECT 
      e.*, 
      u.fullName AS organizerName,
      COALESCE(pt.physicalAllocated, 0) AS physicalAllocated,
      COALESCE(pt.physicalSold, 0) AS physicalSold,
      COALESCE(pt.physicalUsed, 0) AS physicalUsed,
      COALESCE(pt.physicalRevenue, 0) AS physicalRevenue,
      COALESCE(ord.onlineSold, 0) AS onlineSold,
      COALESCE(ord.onlineRevenue, 0) AS onlineRevenue
     FROM events e 
     LEFT JOIN users u ON u.uid = e.organizerId
     LEFT JOIN (
       SELECT 
         eventId,
         SUM(status = 'ALLOCATED') AS physicalAllocated,
         SUM(status = 'SOLD') AS physicalSold,
         SUM(status = 'USED') AS physicalUsed,
         SUM(CASE WHEN status IN ('SOLD', 'USED') THEN price ELSE 0 END) AS physicalRevenue
       FROM physical_tickets
       GROUP BY eventId
     ) pt ON pt.eventId = e.id
     LEFT JOIN (
       SELECT 
         eventId,
         SUM(quantity) AS onlineSold,
         SUM(totalAmount) AS onlineRevenue
       FROM orders
       WHERE status IN ('confirmed', 'used') OR paymentStatus = 'PAID'
       GROUP BY eventId
     ) ord ON ord.eventId = e.id
     WHERE e.organizerId = ?
     ORDER BY e.date DESC, e.time DESC`,
    [user.uid]
  );

  const mappedEvents = events.map((event) => {
    const physicalAllocated = Number(event.physicalAllocated || 0);
    const physicalSold = Number(event.physicalSold || 0) + Number(event.physicalUsed || 0);
    const physicalRevenue = Number(event.physicalRevenue || 0);
    const onlineSold = Number(event.onlineSold || 0);
    const onlineRevenue = Number(event.onlineRevenue || 0);

    // Calculate actual sold vs allocated (Allocated physical tickets are NOT sold!)
    let actualTicketsSold = onlineSold + physicalSold;
    let actualRevenue = onlineRevenue + physicalRevenue;

    // Fallback if ticketsAvailable was decremented directly without order records:
    if (actualTicketsSold === 0 && (Number(event.ticketsTotal) - Number(event.ticketsAvailable)) > 0) {
      actualTicketsSold = Math.max(0, (Number(event.ticketsTotal) - Number(event.ticketsAvailable)) - physicalAllocated);
      actualRevenue = actualTicketsSold * Number(event.price || 0);
    }

    return {
      ...event,
      physicalAllocated,
      physicalSold,
      physicalUsed: Number(event.physicalUsed || 0),
      physicalRevenue,
      onlineSold,
      onlineRevenue,
      actualTicketsSold,
      actualRevenue,
    };
  });

  return NextResponse.json({ events: mappedEvents });
}