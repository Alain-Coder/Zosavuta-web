import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (userId) { sql += ' AND userId = ?'; params.push(userId); }
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
  const body = await req.json();
  const {
    userId, eventId, eventTitle, eventDate, eventTime, eventLocation, eventVenue, eventImage,
    quantity, price, totalAmount, tier = 'Regular', firstName, lastName, email, phone,
    paymentMethod, busTransport = false, ticketNumbers = [],
  } = body;

  const orderId = `ZOS-${Date.now()}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO orders (id, userId, eventId, eventTitle, eventDate, eventTime, eventLocation,
        eventVenue, eventImage, quantity, price, totalAmount, status, tier, firstName, lastName,
        email, phone, paymentMethod, busTransport)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId, userId, eventId, eventTitle, eventDate, eventTime, eventLocation,
        eventVenue, eventImage, quantity, price, totalAmount, 'confirmed', tier,
        firstName, lastName, email, phone, paymentMethod, busTransport ? 1 : 0]
    );

    // Insert ticket numbers
    const nums: string[] = ticketNumbers.length
      ? ticketNumbers
      : Array.from({ length: quantity }, (_, i) => `TK-${String(Date.now()).slice(-5)}${i + 1}`);
    for (const tn of nums) {
      await conn.execute('INSERT INTO order_tickets (orderId, ticketNumber) VALUES (?, ?)', [orderId, tn]);
    }

    // Decrement available tickets
    await conn.execute(
      'UPDATE events SET ticketsAvailable = ticketsAvailable - ? WHERE id = ?',
      [quantity, eventId]
    );

    await conn.commit();
    return NextResponse.json({ id: orderId, ticketNumbers: nums }, { status: 201 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
