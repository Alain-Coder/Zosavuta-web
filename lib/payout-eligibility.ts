import pool, { query, execute } from '@/lib/db';
import { checkOrganizerIsApproved, getVerificationByUserId } from '@/lib/organizer-verification';

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

    // 1. Conclude events whose date is strictly before today (the event finished yesterday or earlier)
    await conn.execute(
      `UPDATE events SET status = 'completed' 
       WHERE status IN ('active', 'sold_out', 'expired') AND date < CURDATE()`
    );

    // 2. Find pending earnings from events that have finished (the next day or completed status)
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

  // Check organizer KYC verification status & bank details
  const [userRow] = await query<{ role: string }>('SELECT role FROM users WHERE uid = ? LIMIT 1', [sellerId]);
  if (userRow && (userRow.role === 'organizer' || userRow.role === 'customer_organizer')) {
    const isApproved = await checkOrganizerIsApproved(sellerId);
    if (!isApproved) {
      return {
        eligible: false,
        pendingBalance,
        availableBalance,
        paidOutBalance,
        currency: balance.currency || 'MWK',
        isBlocked: true,
        reason: 'Organizer verification required. Your account must be verified and approved before receiving seller payouts.',
      };
    }

    const verif = await getVerificationByUserId(sellerId);
    const rawBank = verif
      ? (verif.businessType === 'registered'
          ? (verif.businessPayoutDetails || verif.individualPayoutDetails)
          : (verif.individualPayoutDetails || verif.businessPayoutDetails))
      : null;

    if (!rawBank || !rawBank.accountNumber || !rawBank.bankName) {
      return {
        eligible: false,
        pendingBalance,
        availableBalance,
        paidOutBalance,
        currency: balance.currency || 'MWK',
        isBlocked: true,
        reason: 'Verified bank account details (Bank Name and Account Number) are required before requesting withdrawals.',
      };
    }
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