import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

/** POST – purchase a resale listing */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.execute(
      `SELECT r.*, o.status AS orderStatus
       FROM resale_listings r JOIN orders o ON o.id = r.orderId
      WHERE r.id = ? AND DATEDIFF(o.eventDate, CURDATE()) = 1 FOR UPDATE`,
      [id]
    );
    const listing = (orderRows as { orderId: string; sellerId: string; price: number; status: string; orderStatus: string }[])[0];
    if (!listing) {
      await conn.rollback();
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (listing.status !== 'ACTIVE' || listing.orderStatus !== 'confirmed') {
      await conn.rollback();
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 409 });
    }
    if (listing.sellerId === user.uid) {
      await conn.rollback();
      return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 });
    }
    await conn.execute(
      "UPDATE resale_listings SET status = 'RESERVED', reservedBy = ?, reservedUntil = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ? AND status = 'ACTIVE'",
      [user.uid, id]
    );

    await conn.commit();
    return NextResponse.json({
      success: true,
      paymentStatus: 'PENDING',
      orderId: listing.orderId,
      message: 'Listing reserved. Payment verification is required before ownership transfer.',
    });
  } catch (err) {
    await conn.rollback();
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    conn.release();
  }
}

/** DELETE – cancel a resale listing (seller only) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const listings = await query<{ sellerId: string; status: string }>(
    'SELECT sellerId, status FROM resale_listings WHERE id = ?',
    [id]
  );

  if (!listings.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listings[0].sellerId !== user.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (listings[0].status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Listing cannot be cancelled' }, { status: 400 });
  }

  await execute("UPDATE resale_listings SET status = 'CANCELLED' WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
