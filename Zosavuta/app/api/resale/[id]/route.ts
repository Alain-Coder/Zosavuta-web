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

  const listings = await query<{
    id: string;
    orderId: string;
    sellerId: string;
    eventId: number;
    price: number;
    status: string;
  }>('SELECT * FROM resale_listings WHERE id = ?', [id]);

  if (!listings.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const listing = listings[0];
  if (listing.status !== 'available') {
    return NextResponse.json({ error: 'This listing is no longer available' }, { status: 400 });
  }
  if (listing.sellerId === user.uid) {
    return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.execute(
      'SELECT * FROM orders WHERE id = ? AND status = ?',
      [listing.orderId, 'confirmed']
    );
    const orders = orderRows as Record<string, unknown>[];
    if (!orders.length) {
      await conn.rollback();
      return NextResponse.json({ error: 'Original ticket is no longer valid' }, { status: 400 });
    }

    await conn.execute(
      'UPDATE orders SET userId = ?, price = ?, totalAmount = ? WHERE id = ?',
      [user.uid, listing.price, listing.price, listing.orderId]
    );

    await conn.execute(
      "UPDATE resale_listings SET status = 'sold' WHERE id = ?",
      [id]
    );

    await conn.commit();
    return NextResponse.json({
      success: true,
      orderId: listing.orderId,
      message: 'Ticket purchased successfully',
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
  if (listings[0].status !== 'available') {
    return NextResponse.json({ error: 'Listing cannot be cancelled' }, { status: 400 });
  }

  await execute("UPDATE resale_listings SET status = 'cancelled' WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
