import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { getPayoutEligibility } from '@/lib/payout-eligibility';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const balances = await query('SELECT pendingBalance, availableBalance, paidOutBalance, currency FROM seller_balances WHERE sellerId = ?', [user.uid]);
  const rows = await query('SELECT * FROM payout_requests WHERE sellerId = ? ORDER BY createdAt DESC', [user.uid]);
  return NextResponse.json({ balance: balances[0] || { pendingBalance: 0, availableBalance: 0, paidOutBalance: 0, currency: 'MWK' }, payouts: rows });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role === 'organizer') {
    return NextResponse.json({ error: 'An eligible seller account is required' }, { status: 403 });
  }
  const amount = Number((await req.json().catch(() => ({}))).amount);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });

  const eligibility = await getPayoutEligibility(user.uid);
  if (!eligibility.eligible || amount > eligibility.availableBalance) {
    return NextResponse.json({ error: eligibility.reason || 'Insufficient available balance' }, { status: 400 });
  }

  const payoutId = `PAY-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [balanceRows] = await conn.execute('SELECT availableBalance FROM seller_balances WHERE sellerId = ? FOR UPDATE', [user.uid]);
    const available = Number((balanceRows as { availableBalance: number }[])[0]?.availableBalance || 0);
    if (amount > available) {
      await conn.rollback();
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 409 });
    }
    await conn.execute(
      `INSERT INTO payout_requests (id, sellerId, amount, status) VALUES (?, ?, ?, 'ACCOUNTANT_REVIEW')`,
      [payoutId, user.uid, amount]
    );
    await conn.execute(
      'UPDATE seller_balances SET availableBalance = availableBalance - ? WHERE sellerId = ?',
      [amount, user.uid]
    );
    await conn.commit();
    return NextResponse.json({ id: payoutId, status: 'ACCOUNTANT_REVIEW' }, { status: 201 });
  } catch (error) {
    await conn.rollback();
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payout request failed' }, { status: 500 });
  } finally {
    conn.release();
  }
}