import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { initializePayChanguPayment } from '@/lib/paychangu';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role === 'organizer') {
    return NextResponse.json({ error: 'An attendee account is required' }, { status: 403 });
  }

  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

  const orders = await query<{ id: string; userId: string; totalAmount: number; email: string; firstName: string; lastName: string; paymentStatus: string }>(
    'SELECT id, userId, totalAmount, email, firstName, lastName, paymentStatus FROM orders WHERE id = ?',
    [orderId]
  );
  const order = orders[0];
  if (!order || order.userId !== user.uid) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.paymentStatus === 'PAID') return NextResponse.json({ error: 'Order is already paid' }, { status: 409 });

  const txRef = `ZOS-${randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase()}`;
  try {
    const payment = await initializePayChanguPayment({
      amount: Number(order.totalAmount),
      currency: 'MWK',
      email: order.email || user.email || `${user.uid}@unknown.local`,
      firstName: order.firstName,
      lastName: order.lastName,
      txRef,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/api/payments/webhook`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/checkout/${orderId}?payment=pending`,
    });
    await execute(
      `INSERT INTO payments (id, orderId, providerReference, idempotencyKey, amount, status)
       VALUES (?, ?, ?, ?, ?, 'PROCESSING')`,
      [`PAY-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`, orderId, payment.providerReference, txRef, order.totalAmount]
    );
    await execute('UPDATE orders SET paymentStatus = \'PROCESSING\', providerReference = ? WHERE id = ?', [payment.providerReference, orderId]);
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment initialization failed' }, { status: 502 });
  }
}