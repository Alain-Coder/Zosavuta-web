import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

/** GET – browse available resale listings */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  const status = searchParams.get('status') || 'ACTIVE';
  const orderId = searchParams.get('orderId');
  const eventId = searchParams.get('eventId');

  let sql = `
    SELECT r.*,
      o.eventTitle, o.eventDate, o.eventTime, o.eventLocation, o.eventVenue, o.eventImage,
      o.quantity, o.tier, o.price AS orderPrice,
      t.ticketNumber,
      e.category, e.ticketsAvailable AS eventTicketsAvailable
    FROM resale_listings r
    JOIN orders o ON o.id = r.orderId
    LEFT JOIN order_tickets t ON t.id = r.ticketId
    LEFT JOIN events e ON e.id = r.eventId
    WHERE r.status = ? AND (e.date >= CURDATE() OR e.date IS NULL)
  `;
  const params: unknown[] = [status];

  if (sellerId) {
    sql += ' AND r.sellerId = ?';
    params.push(sellerId);
  }
  if (orderId) {
    sql += ' AND r.orderId = ?';
    params.push(orderId);
  }
  if (eventId) {
    sql += ' AND r.eventId = ?';
    params.push(eventId);
  }

  sql += ' ORDER BY r.createdAt DESC';

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

/** POST – list ticket(s) for resale */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role === 'organizer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, price, ticketIds, ticketId } = body;

  if (!orderId || price == null) {
    return NextResponse.json({ error: 'Order ID and price are required' }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
  }

  const orders = await query<{ userId: string; eventId: number; status: string; price: number; eventDate: string; quantity: number }>(
    `SELECT o.userId, o.eventId, o.status, o.price, o.quantity, e.date AS eventDate
     FROM orders o JOIN events e ON e.id = o.eventId WHERE o.id = ? AND (e.date >= CURDATE() OR e.date IS NULL)`,
    [orderId]
  );

  if (!orders.length) {
    return NextResponse.json({ error: 'Order not found or event has already passed' }, { status: 404 });
  }

  const order = orders[0];
  if (order.userId !== user.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (order.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed tickets can be listed' }, { status: 400 });
  }

  // Fetch all tickets for this order owned by the user
  const orderTickets = await query<{ id: number; ticketNumber: string; status: string; listedForResale: number }>(
    `SELECT id, ticketNumber, status, listedForResale FROM order_tickets
     WHERE orderId = ? AND (currentOwnerId = ? OR currentOwnerId IS NULL)`,
    [orderId, user.uid]
  );

  if (!orderTickets.length) {
    return NextResponse.json({ error: 'No tickets found for this order' }, { status: 404 });
  }

  // Determine target ticket IDs to list
  let targetTicketIds: number[] = [];
  if (Array.isArray(ticketIds) && ticketIds.length > 0) {
    targetTicketIds = ticketIds.map(Number).filter((n) => Number.isInteger(n));
  } else if (ticketId != null) {
    const parsedId = Number(ticketId);
    if (Number.isInteger(parsedId)) targetTicketIds = [parsedId];
  } else {
    // If none specified, pick unlisted valid tickets (or the first available one)
    const available = orderTickets.filter((t) => t.status === 'VALID' && Number(t.listedForResale) === 0);
    if (available.length > 0) {
      targetTicketIds = [available[0].id];
    }
  }

  if (!targetTicketIds.length) {
    return NextResponse.json({ error: 'Please select at least one ticket to sell' }, { status: 400 });
  }

  // Validate each target ticket
  const validTicketsToList = orderTickets.filter(
    (t) => targetTicketIds.includes(t.id) && t.status === 'VALID' && Number(t.listedForResale) === 0
  );

  if (validTicketsToList.length !== targetTicketIds.length) {
    return NextResponse.json(
      { error: 'One or more selected tickets are already listed for resale or not eligible' },
      { status: 400 }
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const createdListings: Array<{ id: string; ticketId: number; price: number }> = [];

    for (const ticket of validTicketsToList) {
      const listingId = `RS-${randomUUID().slice(0, 8).toUpperCase()}`;

      await conn.execute(
        `INSERT INTO resale_listings (id, orderId, ticketId, eventId, sellerId, price, originalPrice, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [listingId, orderId, ticket.id, order.eventId, user.uid, parsedPrice, order.price]
      );

      // Hide and invalidate QR for entrance while listed
      await conn.execute(
        `UPDATE order_tickets SET listedForResale = 1 WHERE id = ?`,
        [ticket.id]
      );

      createdListings.push({ id: listingId, ticketId: ticket.id, price: parsedPrice });
    }

    await conn.commit();
    return NextResponse.json({ success: true, listings: createdListings }, { status: 201 });
  } catch (err: any) {
    await conn.rollback();
    console.error('Error listing tickets for resale:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list tickets for resale' }, { status: 500 });
  } finally {
    conn.release();
  }
}
