import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const operatorId = searchParams.get('operatorId');
  const tripId = searchParams.get('tripId');

  let sql = 'SELECT * FROM bus_bookings WHERE 1=1';
  const params: any[] = [];
  if (userId) { sql += ' AND userId = ?'; params.push(userId); }
  if (operatorId) { sql += ' AND operatorId = ?'; params.push(operatorId); }
  if (tripId) { sql += ' AND tripId = ?'; params.push(tripId); }
  sql += ' ORDER BY createdAt DESC';

  return NextResponse.json(await query(sql, params));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = 'bb_' + Math.random().toString(36).substr(2, 9);
  const { tripId, userId, seats, totalPrice, operatorId, seatNumbers = [] } = body;
  const bookingReference = 'BR-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO bus_bookings (id, tripId, userId, seats, totalPrice, status, paymentStatus, bookingReference, operatorId, seatNumbers)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, tripId, userId, seats, totalPrice, 'confirmed', 'paid', bookingReference, operatorId, JSON.stringify(seatNumbers)]
    );

    // Create bus tickets
    for (let i = 0; i < seats; i++) {
      const ticketId = 'bt_' + Math.random().toString(36).substr(2, 9);
      await conn.execute(
        `INSERT INTO bus_tickets (id, bookingId, qrCode, seatNumber) VALUES (?,?,?,?)`,
        [ticketId, id, `QR-${id}-${i}`, seatNumbers[i] || null]
      );
    }

    // Decrement available seats
    await conn.execute(
      'UPDATE trips SET availableSeats = availableSeats - ?, bookedSeats = bookedSeats + ? WHERE id = ?',
      [seats, seats, tripId]
    );

    await conn.commit();
    return NextResponse.json({ id, bookingReference }, { status: 201 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
