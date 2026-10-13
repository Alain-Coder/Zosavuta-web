import pool from '@/lib/db';

export type PayoutReconciliationResult = 'COMPLETED' | 'FAILED' | 'PENDING' | 'DUPLICATE' | 'NOT_FOUND';

const SUCCESS_STATUSES = ['success', 'successful', 'completed'];
const FAILURE_STATUSES = ['failed', 'rejected', 'cancelled'];

export async function applyVerifiedPayoutStatus(
  providerReference: string,
  verifiedStatus: string
): Promise<PayoutReconciliationResult> {
  const status = verifiedStatus.trim().toLowerCase();
  if (!SUCCESS_STATUSES.includes(status) && !FAILURE_STATUSES.includes(status)) {
    return 'PENDING';
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [payoutRows] = await conn.execute(
      'SELECT id, sellerId, amount, status FROM payout_requests WHERE providerReference = ? FOR UPDATE',
      [providerReference]
    );
    const payout = (payoutRows as { id: string; sellerId: string; amount: number; status: string }[])[0];
    if (!payout) {
      await conn.rollback();
      return 'NOT_FOUND';
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(payout.status)) {
      await conn.commit();
      return 'DUPLICATE';
    }
    if (payout.status !== 'PROCESSING') {
      await conn.rollback();
      return 'PENDING';
    }

    if (SUCCESS_STATUSES.includes(status)) {
      await conn.execute(
        `UPDATE payout_requests SET status = 'COMPLETED' WHERE id = ?`,
        [payout.id]
      );
      await conn.execute(
        'UPDATE seller_balances SET paidOutBalance = paidOutBalance + ? WHERE sellerId = ?',
        [payout.amount, payout.sellerId]
      );
      await conn.execute(
        `INSERT IGNORE INTO financial_ledger (sellerId, payoutId, transactionType, amount, status, providerReference, description)
         VALUES (?, ?, 'PAYOUT', ?, 'COMPLETED', ?, 'Settlement payout successfully completed by PayChangu')`,
        [payout.sellerId, payout.id, payout.amount, providerReference]
      );
      await conn.commit();
      return 'COMPLETED';
    }

    await conn.execute(
      `UPDATE payout_requests SET status = 'FAILED' WHERE id = ?`,
      [payout.id]
    );
    await conn.execute(
      'UPDATE seller_balances SET availableBalance = availableBalance + ? WHERE sellerId = ?',
      [payout.amount, payout.sellerId]
    );
    await conn.execute(
      `INSERT IGNORE INTO financial_ledger (sellerId, payoutId, transactionType, amount, status, providerReference, description)
       VALUES (?, ?, 'PAYOUT_REVERSAL', ?, 'COMPLETED', ?, 'Settlement payout failed by provider; balance restored')`,
      [payout.sellerId, payout.id, payout.amount, providerReference]
    );
    await conn.commit();
    return 'FAILED';
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
