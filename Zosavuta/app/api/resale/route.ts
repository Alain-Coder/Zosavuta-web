import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

/** GET – browse available resale listings */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  const status = searchParams.get('status') || 'available';
  const orderId = searchParams.get('orderId');

  let sql = `
    SELECT r.*,
      o.eventTitle, o.eventDate, o.eventTime, o.eventLocation, o.eventVenue, o.eventImage,
      o.quantity, o.tier, o.price AS orderPrice,
      e.category, e.ticketsAvailable AS eventTicketsAvailable
    FROM resale_listings r
    JOIN orders o ON o.id = r.orderId
    LEFT JOIN events e ON e.id = r.eventId
    WHERE r.status = ?
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

  sql += ' ORDER BY r.createdAt DESC';

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

/** POST – list a ticket for resale */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, price } = body;

  if (!orderId || price == null) {
    return NextResponse.json({ error: 'Order ID and price are required' }, { status: 400 });
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
  }

  const orders = await query<{ userId: string; eventId: number; status: string; price: number }>(
    'SELECT userId, eventId, status, price FROM orders WHERE id = ?',
    [orderId]
  );

  if (!orders.length) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = orders[0];
  if (order.userId !== user.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (order.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed tickets can be listed' }, { status: 400 });
  }

  const existing = await query(
    "SELECT id FROM resale_listings WHERE orderId = ? AND status = 'available'",
    [orderId]
  );
  if (existing.length) {
    return NextResponse.json({ error: 'This ticket is already listed' }, { status: 400 });
  }

  const listingId = `RS-${randomUUID().slice(0, 8).toUpperCase()}`;
  await execute(
    `INSERT INTO resale_listings (id, orderId, eventId, sellerId, price, originalPrice, status)
     VALUES (?, ?, ?, ?, ?, ?, 'available')`,
    [listingId, orderId, order.eventId, user.uid, parsedPrice, order.price]
  );

  return NextResponse.json({ id: listingId, status: 'available' }, { status: 201 });
}
