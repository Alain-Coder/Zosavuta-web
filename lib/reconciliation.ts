import { query, execute } from '@/lib/db';
import { verifyPayChanguTransaction } from '@/lib/paychangu';
import { completeVerifiedPayment } from '@/lib/payment-settlement';
import { releaseEligiblePendingBalances } from '@/lib/payout-eligibility';

export interface ReconciliationReport {
  timestamp: string;
  expiredResaleLocksReleased: number;
  pendingBalancesReleased: number;
  paymentsChecked: number;
  paymentsFinalized: number;
  paymentsFailed: number;
  errors: string[];
}

export async function reconcilePendingPayments(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    expiredResaleLocksReleased: 0,
    pendingBalancesReleased: 0,
    paymentsChecked: 0,
    paymentsFinalized: 0,
    paymentsFailed: 0,
    errors: [],
  };

  try {
    // 1. Release expired resale listing reservations
    const releaseResult = await execute(
      `UPDATE resale_listings 
       SET status = 'ACTIVE', reservedBy = NULL, reservedUntil = NULL 
       WHERE status = 'RESERVED' AND reservedUntil < NOW()`
    );
    report.expiredResaleLocksReleased = releaseResult.affectedRows || 0;

    // 2. Release eligible T+2 cooling-off pending balances to seller available balances
    report.pendingBalancesReleased = await releaseEligiblePendingBalances();

    // 2. Fetch pending payments created between 10 minutes and 24 hours ago
    const pendingPayments = await query<{
      id: string;
      orderId: string;
      providerReference: string | null;
      idempotencyKey: string;
      amount: number;
    }>(
      `SELECT id, orderId, providerReference, idempotencyKey, amount 
       FROM payments 
       WHERE status = 'PENDING' 
         AND createdAt <= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    report.paymentsChecked = pendingPayments.length;

    for (const payment of pendingPayments) {
      const txRef = payment.providerReference || payment.idempotencyKey;
      if (!txRef) continue;

      try {
        const verified = await verifyPayChanguTransaction(txRef);

        if (
          String(verified?.status).toLowerCase() === 'success' &&
          Number(verified?.amount) === Number(payment.amount) &&
          String(verified?.currency).toUpperCase() === 'MWK'
        ) {
          await completeVerifiedPayment(payment.id, payment.orderId, txRef);
          report.paymentsFinalized += 1;
        } else if (
          String(verified?.status).toLowerCase() === 'failed' ||
          String(verified?.status).toLowerCase() === 'cancelled'
        ) {
          await execute(`UPDATE payments SET status = 'FAILED' WHERE id = ?`, [payment.id]);
          await execute(`UPDATE orders SET paymentStatus = 'FAILED', status = 'cancelled' WHERE id = ?`, [payment.orderId]);
          report.paymentsFailed += 1;
        }
      } catch (err: any) {
        report.errors.push(`Payment ${payment.id} (${txRef}): ${err?.message || 'Verification error'}`);
      }
    }
  } catch (globalErr: any) {
    report.errors.push(`Global reconciliation failure: ${globalErr?.message}`);
  }

  return report;
}
