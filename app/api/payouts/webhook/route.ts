import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import pool from '@/lib/db';

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYCHANGU_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const received = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('Signature')
    || req.headers.get('x-paychangu-signature')
    || req.headers.get('x-webhook-signature')
    || req.headers.get('signature');

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const providerRef = String(payload.charge_id || payload.tx_ref || payload.data?.charge_id || '');
  const status = String(payload.status || payload.event || '').toLowerCase();

  if (!providerRef) {
    return NextResponse.json({ error: 'Provider reference is missing' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [payoutRows] = await conn.execute(
      'SELECT id, sellerId, amount, status FROM payout_requests WHERE providerReference = ? FOR UPDATE',
      [providerRef]
    );

    const payout = (payoutRows as { id: string; sellerId: string; amount: number; status: string }[])[0];
    if (!payout) {
      await conn.rollback();
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    if (payout.status === 'COMPLETED') {
      await conn.commit();
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (status === 'success' || status === 'completed') {
      await conn.execute(
        `UPDATE payout_requests SET status = 'COMPLETED' WHERE id = ?`,
        [payout.id]
      );
      await conn.execute(
        `UPDATE seller_balances SET paidOutBalance = paidOutBalance + ? WHERE sellerId = ?`,
        [payout.amount, payout.sellerId]
      );
      await conn.execute(
        `INSERT IGNORE INTO financial_ledger (sellerId, payoutId, transactionType, amount, status, providerReference, description)
         VALUES (?, ?, 'PAYOUT', ?, 'COMPLETED', ?, 'Settlement payout successfully completed by PayChangu')`,
        [payout.sellerId, payout.id, payout.amount, providerRef]
      );
    } else if (status === 'failed' || status === 'rejected') {
      await conn.execute(
        `UPDATE payout_requests SET status = 'FAILED' WHERE id = ?`,
        [payout.id]
      );
      // Restore seller available balance
      await conn.execute(
        `UPDATE seller_balances SET availableBalance = availableBalance + ? WHERE sellerId = ?`,
        [payout.amount, payout.sellerId]
      );
      await conn.execute(
        `INSERT IGNORE INTO financial_ledger (sellerId, payoutId, transactionType, amount, status, providerReference, description)
         VALUES (?, ?, 'PAYOUT_REVERSAL', ?, 'COMPLETED', ?, 'Settlement payout failed by provider; balance restored')`,
        [payout.sellerId, payout.id, payout.amount, providerRef]
      );
    }

    await conn.commit();
    return NextResponse.json({ received: true });
  } catch (err: any) {
    await conn.rollback();
    return NextResponse.json({ error: err?.message || 'Payout webhook error' }, { status: 500 });
  } finally {
    conn.release();
  }
}
