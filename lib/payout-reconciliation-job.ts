import { query } from '@/lib/db';
import { getPayChanguPayoutDetails } from '@/lib/paychangu-payouts';
import { applyVerifiedPayoutStatus } from '@/lib/payout-reconciliation';

const STALE_PAYOUT_MINUTES = 10;
const MAX_PAYOUTS_PER_RUN = 50;

export interface PayoutReconciliationReport {
  timestamp: string;
  payoutsChecked: number;
  payoutsCompleted: number;
  payoutsFailed: number;
  payoutsPending: number;
  errors: string[];
}

export async function reconcileStalePayouts(): Promise<PayoutReconciliationReport> {
  const report: PayoutReconciliationReport = {
    timestamp: new Date().toISOString(),
    payoutsChecked: 0,
    payoutsCompleted: 0,
    payoutsFailed: 0,
    payoutsPending: 0,
    errors: [],
  };

  const payouts = await query<{ id: string; providerReference: string }>(
    `SELECT id, providerReference
     FROM payout_requests
     WHERE status = 'PROCESSING'
       AND providerReference IS NOT NULL
       AND updatedAt <= DATE_SUB(NOW(), INTERVAL ${STALE_PAYOUT_MINUTES} MINUTE)
     ORDER BY updatedAt ASC
     LIMIT ${MAX_PAYOUTS_PER_RUN}`
  );
  report.payoutsChecked = payouts.length;

  for (const payout of payouts) {
    try {
      const details = await getPayChanguPayoutDetails(payout.providerReference);
      const verifiedStatus = details?.data?.transaction?.status;
      if (typeof verifiedStatus !== 'string' || !verifiedStatus.trim()) {
        throw new Error('PayChangu payout details did not include data.transaction.status');
      }

      const result = await applyVerifiedPayoutStatus(payout.providerReference, verifiedStatus);
      if (result === 'COMPLETED') {
        report.payoutsCompleted += 1;
      } else if (result === 'FAILED') {
        report.payoutsFailed += 1;
      } else {
        report.payoutsPending += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payout reconciliation failed';
      console.error('[payout-reconciliation] Failed to reconcile payout', payout.id, error);
      report.errors.push(`Payout ${payout.id} (${payout.providerReference}): ${message}`);
    }
  }

  return report;
}
