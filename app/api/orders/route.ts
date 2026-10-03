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

  // Attach ticket details, numbers and tokens to each order
  for (const order of rows) {
    const tickets = await query<any>(
      `SELECT t.id, t.ticketNumber, t.verificationToken, t.currentOwnerId, t.status, t.listedForResale,
              r.id AS resaleListingId, r.price AS resalePrice, r.status AS resaleStatus
       FROM order_tickets t
       LEFT JOIN resale_listings r ON r.ticketId = t.id AND r.status IN ('ACTIVE', 'RESERVED')
       WHERE t.orderId = ?
       ORDER BY t.id ASC`,
      [order.id]
    );

    (order as any).tickets = tickets.map((t: any) => ({
      id: Number(t.id),
      ticketNumber: String(t.ticketNumber),
      verificationToken: String(t.verificationToken),
      currentOwnerId: t.currentOwnerId ? String(t.currentOwnerId) : null,
      status: String(t.status),
      listedForResale: Boolean(Number(t.listedForResale) === 1 || t.resaleListingId),
      resalePrice: t.resalePrice ? Number(t.resalePrice) : null,
      resaleListingId: t.resaleListingId ? String(t.resaleListingId) : null,
      resaleStatus: t.resaleStatus ? String(t.resaleStatus) : null,
    }));
    (order as any).ticketNumbers = tickets.map((t: any) => t.ticketNumber);
    (order as any).ticketTokens = tickets.map((t: any) => t.verificationToken);
    (order as any).isListed = tickets.some((t: any) => Number(t.listedForResale) === 1 || Boolean(t.resaleListingId));
    (order as any).isResalePurchase = Boolean(
      String(order.id).startsWith('ORD-RESALE-') ||
      String(order.tier || '').startsWith('RSL-') ||
      String(order.tier || '').startsWith('RESALE-')
    );

    if (order.status === 'confirmed' && tickets.length > 0) {
      if (tickets.every((ticket: any) => ticket.status === 'USED')) {
        (order as any).status = 'used';
      }
    }
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
      `SELECT id, title, date, time, location, venue, image, price, ticketTypes, ticketsAvailable, status
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

    let ticketTypes: Array<{ name: string; price: number }> = [];
    try {
      ticketTypes =
        typeof event.ticketTypes === 'string'
          ? JSON.parse(String(event.ticketTypes))
          : (event.ticketTypes as Array<{ name: string; price: number }> || []);
    } catch {
      ticketTypes = [];
    }

    // Use only organizer-configured ticket types — no auto-calculation
    if (!ticketTypes || ticketTypes.length === 0) {
      // Fallback for legacy events without ticketTypes: use the event base price as Standard
      ticketTypes = [{ name: 'Standard', price: Number(event.price || 0) || 3500 }];
    }

    const selectedType = ticketTypes.find((item) => item.name.toLowerCase() === String(tier).toLowerCase());
    if (!selectedType) {
      await conn.rollback();
      return NextResponse.json({ error: `Selected ticket type "${tier}" is not available` }, { status: 400 });
    }
    const unitPrice = Number(selectedType.price);
    const totalAmount = unitPrice * parsedQuantity;
    const orderId = `ZOS-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    await conn.execute(
      `INSERT INTO orders (id, userId, eventId, eventTitle, eventDate, eventTime, eventLocation,
        eventVenue, eventImage, quantity, price, totalAmount, status, tier, firstName, lastName,
        email, phone, paymentMethod, busTransport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId, user.uid, parsedEventId, event.title ?? null, event.date ?? null, event.time ?? null, event.location ?? null,
        event.venue ?? null, event.image ?? null, parsedQuantity, unitPrice, totalAmount, 'pending', selectedType.name,
        firstName ?? null, lastName ?? null, email || user.email || `${user.uid}@unknown.local`, phone ?? null, paymentMethod ?? null, 0]
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
    console.error('API /api/orders POST Error:', err);
    return NextResponse.json({ error: 'Unable to create order. Please try again.' }, { status: 500 });
  } finally {
    conn.release();
  }
}
