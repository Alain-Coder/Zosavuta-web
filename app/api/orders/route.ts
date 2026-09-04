import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const eventId = searchParams.get('eventId');
  const status = searchParams.get('status');

  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (userId) { sql += ' AND userId = ?'; params.push(userId); }
  if (eventId) { sql += ' AND eventId = ?'; params.push(eventId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY createdAt DESC';

  const rows = await query(sql, params);

  // Attach ticket numbers to each order
  for (const order of rows) {
    const tickets = await query('SELECT ticketNumber FROM order_tickets WHERE orderId = ?', [order.id]);
    (order as any).ticketNumbers = tickets.map((t: any) => t.ticketNumber);
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role === 'organizer') {
    return NextResponse.json({ error: 'An attendee account is required' }, { status: 403 });
  }

  const body = await req.json();
  const {
    eventId, quantity, tier = 'Regular', firstName, lastName, email, phone, paymentMethod,
  } = body;
  const parsedEventId = Number(eventId);
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedEventId) || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    return NextResponse.json({ error: 'A valid event and quantity are required' }, { status: 400 });
  }

  const idempotencyKey = req.headers.get('Idempotency-Key') || randomUUID();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.execute(
      'SELECT id, paymentStatus FROM orders WHERE idempotencyKey = ? FOR UPDATE',
      [idempotencyKey]
    );
    const existing = existingRows as { id: string; paymentStatus: string }[];
    if (existing.length) {
      await conn.commit();
      return NextResponse.json({ id: existing[0].id, paymentStatus: existing[0].paymentStatus });
    }

    const [eventRows] = await conn.execute(
      `SELECT id, title, date, time, location, venue, image, price, ticketsAvailable, status
       FROM events WHERE id = ? FOR UPDATE`,
      [parsedEventId]
    );
    const events = eventRows as Record<string, unknown>[];
    if (!events.length || events[0].status !== 'active') {
      await conn.rollback();
      return NextResponse.json({ error: 'Event is not available for purchase' }, { status: 400 });
    }
    const event = events[0];
    if (Number(event.ticketsAvailable) < parsedQuantity) {
      await conn.rollback();
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 409 });
    }

    const unitPrice = Number(event.price) * (tier === 'VIP' ? 2 : 1);
    const totalAmount = unitPrice * parsedQuantity;
    const orderId = `ZOS-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    await conn.execute(
      `INSERT INTO orders (id, userId, eventId, eventTitle, eventDate, eventTime, eventLocation,
        eventVenue, eventImage, quantity, price, totalAmount, status, tier, firstName, lastName,
        email, phone, paymentMethod, busTransport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId, user.uid, parsedEventId, event.title, event.date, event.time, event.location,
        event.venue, event.image, parsedQuantity, unitPrice, totalAmount, 'pending', tier,
        firstName, lastName, email || user.email, phone, paymentMethod, 0]
    );

    await conn.execute(
      `INSERT INTO payments (id, orderId, idempotencyKey, amount, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [`PAY-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`, orderId, idempotencyKey, totalAmount]
    );
    await conn.execute(
      `UPDATE orders SET idempotencyKey = ?, paymentStatus = 'PENDING' WHERE id = ?`,
      [idempotencyKey, orderId]
    );

    await conn.commit();
    return NextResponse.json({ id: orderId, paymentStatus: 'PENDING' }, { status: 201 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
