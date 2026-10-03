import pool, { query, execute } from '@/lib/db';

export interface PayoutEligibility {
  eligible: boolean;
  pendingBalance: number;
  availableBalance: number;
  paidOutBalance: number;
  currency: string;
  isBlocked: boolean;
  reason?: string;
}

export async function releaseEligiblePendingBalances(): Promise<number> {
  const conn = await pool.getConnection();
  let releasedCount = 0;
  try {
    await conn.beginTransaction();

    // 1. Mark past active events as completed
    await conn.execute(
      `UPDATE events SET status = 'completed' 
       WHERE status = 'active' AND date < CURDATE()`
    );

    // 2. Find pending earnings where event ended or completed
    const [eligibleEntries] = await conn.execute(
      `SELECT l.id, l.sellerId, l.amount 
       FROM financial_ledger l
       JOIN events e ON l.eventId = e.id
       WHERE l.status = 'PENDING'
         AND l.transactionType IN ('PRIMARY_TICKET_SALE', 'SECONDARY_TICKET_SALE')
         AND (e.date < CURDATE() OR e.status = 'completed')
       FOR UPDATE`
    );

    const rows = eligibleEntries as { id: number; sellerId: string; amount: number }[];

    for (const entry of rows) {
      await conn.execute(`UPDATE financial_ledger SET status = 'COMPLETED' WHERE id = ?`, [entry.id]);
      await conn.execute(
        `INSERT INTO seller_balances (sellerId, pendingBalance, availableBalance, paidOutBalance)
         VALUES (?, 0, ?, 0)
         ON DUPLICATE KEY UPDATE
           pendingBalance = GREATEST(0, pendingBalance - ?),
           availableBalance = availableBalance + ?`,
        [entry.sellerId, entry.amount, entry.amount, entry.amount]
      );
      releasedCount += 1;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('Error releasing pending balances:', err);
  } finally {
    conn.release();
  }

  return releasedCount;
}

export async function getPayoutEligibility(sellerId: string): Promise<PayoutEligibility> {
  // Trigger cooling-off release check
  await releaseEligiblePendingBalances();

  const rows = await query<{
    pendingBalance: number;
    availableBalance: number;
    paidOutBalance: number;
    currency: string;
  }>(
    `SELECT pendingBalance, availableBalance, paidOutBalance, currency 
     FROM seller_balances 
     WHERE sellerId = ? LIMIT 1`,
    [sellerId]
  );

  const balance = rows[0] || {
    pendingBalance: 0,
    availableBalance: 0,
    paidOutBalance: 0,
    currency: 'MWK',
  };

  const pendingBalance = Number(balance.pendingBalance || 0);
  const availableBalance = Number(balance.availableBalance || 0);
  const paidOutBalance = Number(balance.paidOutBalance || 0);

  // Check for payout blocks on orders or account standing
  const blockedOrders = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE userId = ? AND payoutStatus = 'BLOCKED'`,
    [sellerId]
  );
  const isBlocked = Number(blockedOrders[0]?.count || 0) > 0;

  if (isBlocked) {
    return {
      eligible: false,
      pendingBalance,
      availableBalance,
      paidOutBalance,
      currency: balance.currency || 'MWK',
      isBlocked: true,
      reason: 'Payouts are currently blocked on your account due to a compliance or refund dispute hold.',
    };
  }

  const MIN_PAYOUT_AMOUNT = 2000;
  if (availableBalance < MIN_PAYOUT_AMOUNT) {
    return {
      eligible: false,
      pendingBalance,
      availableBalance,
      paidOutBalance,
      currency: balance.currency || 'MWK',
      isBlocked: false,
      reason: `Available balance (MWK ${availableBalance.toLocaleString()}) is below minimum payout threshold of MWK ${MIN_PAYOUT_AMOUNT.toLocaleString()}.`,
    };
  }

  return {
    eligible: true,
    pendingBalance,
    availableBalance,
    paidOutBalance,
    currency: balance.currency || 'MWK',
    isBlocked: false,
  };
}