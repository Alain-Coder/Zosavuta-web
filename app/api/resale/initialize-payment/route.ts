import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { initializePayChanguPayment } from '@/lib/paychangu';
import { calculateResaleFees } from '@/lib/fees';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, buyerId, email, firstName, lastName } = body;

    if (!listingId || !buyerId || !email) {
      return NextResponse.json({ error: 'listingId, buyerId, and email are required' }, { status: 400 });
    }

    const listings = await query<any>(
      `SELECT r.id, r.orderId, r.eventId, r.sellerId, r.price, r.status, r.ticketId, e.title as eventTitle, e.date as eventDate, e.time as eventTime, e.location as eventLocation, e.venue as eventVenue
       FROM resale_listings r
       JOIN events e ON r.eventId = e.id
       WHERE r.id = ? LIMIT 1`,
      [listingId]
    );

    const listing = listings[0];
    if (!listing) {
      return NextResponse.json({ error: 'Resale listing not found' }, { status: 404 });
    }

    if (listing.sellerId === buyerId) {
      return NextResponse.json({ error: 'You cannot purchase your own resale listing' }, { status: 400 });
    }

    if (listing.status !== 'ACTIVE') {
      if (listing.status === 'RESERVED') {
        const reservedUntil = new Date(listing.reservedUntil).getTime();
        if (reservedUntil > Date.now() && listing.reservedBy !== buyerId) {
          return NextResponse.json({ error: 'Resale listing is currently reserved by another buyer' }, { status: 409 });
        }
      } else {
        return NextResponse.json({ error: `Resale listing is no longer available (Status: ${listing.status})` }, { status: 410 });
      }
    }

    // Reserve the listing for 15 minutes
    await query(
      `UPDATE resale_listings SET status = 'RESERVED', reservedBy = ?, reservedUntil = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`,
      [buyerId, listingId]
    );

    const feeBreakdown = await calculateResaleFees(listing.price);

    const orderId = `ORD-RESALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txRef = `TX-RESALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO orders (id, userId, eventId, eventTitle, eventDate, eventTime, eventLocation, eventVenue, quantity, price, totalAmount, status, paymentStatus, tier, email, firstName, lastName, idempotencyKey)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending', 'PENDING', ?, ?, ?, ?, ?)`,
        [
          orderId,
          buyerId,
          listing.eventId,
          listing.eventTitle,
          listing.eventDate,
          listing.eventTime,
          listing.eventLocation,
          listing.eventVenue,
          listing.price,
          feeBreakdown.resalePrice,
          listingId,
          email,
          firstName || 'Buyer',
          lastName || 'Buyer',
          txRef,
        ]
      );

      await conn.execute(
        `INSERT INTO payments (id, orderId, provider, idempotencyKey, amount, currency, status)
         VALUES (?, ?, 'PAYCHANGU', ?, ?, 'MWK', 'PENDING')`,
        [orderId, orderId, txRef, feeBreakdown.resalePrice]
      );

      await conn.commit();
    } catch (dbErr) {
      await conn.rollback();
      throw dbErr;
    } finally {
      conn.release();
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const paychanguResult = await initializePayChanguPayment({
      amount: feeBreakdown.resalePrice,
      currency: 'MWK',
      email,
      firstName: firstName || 'Customer',
      lastName: lastName || 'Customer',
      txRef,
      callbackUrl: `${baseUrl}/api/payments/webhook`,
      returnUrl: `${baseUrl}/tickets?paymentStatus=success&orderId=${orderId}`,
    });

    return NextResponse.json({
      success: true,
      orderId,
      txRef,
      checkoutUrl: paychanguResult.checkoutUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to initialize resale payment' }, { status: 500 });
  }
}
