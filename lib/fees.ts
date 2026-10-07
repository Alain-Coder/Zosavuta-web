import { query } from '@/lib/db';

export interface FeeSchedule {
  id?: number;
  name: string;
  buyerFeePercent: number;
  buyerFeeFixed: number;
  organizerFeePercent: number;
  resaleFeePercent: number;
  payoutFeeFixed: number;
  payoutFeePercent: number;
  refundFeeFixed: number;
}

// Mandatory platform fees per payouts.md:
// Platform Fee = 8%
// PayChangu Bank Payout Fee = 1.7% + MWK 700
export const PLATFORM_FEE_PERCENT = 8.0;
export const BANK_PAYOUT_PERCENT = 1.7;
export const BANK_PAYOUT_FIXED_FEE = 700.0;

// PayChangu collection fees (absorbed by platform, not charged to customer or deducted from organizer balance)
export const PAYCHANGU_COLLECTION_FEES = {
  MOBILE_MONEY: 3.0,
  CARD: 3.0,
  BANK_TRANSFER: 2.0,
} as const;

const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  name: 'DEFAULT_FALLBACK',
  buyerFeePercent: 0.0,
  buyerFeeFixed: 0.0,
  organizerFeePercent: PLATFORM_FEE_PERCENT, // 8%
  resaleFeePercent: 10.0,
  payoutFeeFixed: BANK_PAYOUT_FIXED_FEE, // MWK 700
  payoutFeePercent: BANK_PAYOUT_PERCENT, // 1.7%
  refundFeeFixed: 200.0,
};

export async function getActiveFeeSchedule(): Promise<FeeSchedule> {
  try {
    const rows = await query<FeeSchedule>(
      'SELECT buyerFeePercent, buyerFeeFixed, organizerFeePercent, resaleFeePercent, payoutFeeFixed, payoutFeePercent, refundFeeFixed FROM financial_fee_schedules WHERE isDefault = 1 LIMIT 1'
    );
    if (rows && rows.length > 0) {
      return {
        name: 'ACTIVE_DB_SCHEDULE',
        buyerFeePercent: 0.0, // Customer pays 0 fee
        buyerFeeFixed: 0.0,
        organizerFeePercent: PLATFORM_FEE_PERCENT, // Always 8%
        resaleFeePercent: Number(rows[0].resaleFeePercent || 10.0),
        payoutFeeFixed: BANK_PAYOUT_FIXED_FEE, // MWK 700
        payoutFeePercent: BANK_PAYOUT_PERCENT, // 1.7%
        refundFeeFixed: Number(rows[0].refundFeeFixed || 200.0),
      };
    }
  } catch (error) {
    console.warn('Fee schedule query fallback to defaults:', error);
  }
  return DEFAULT_FEE_SCHEDULE;
}

/**
 * Calculates primary ticket order fees.
 * Customer pays 100% of advertised ticket price (no buyer fee added).
 * Platform fee is 8%.
 * Organizer balance is 92% (ticketPrice - platformFee).
 * PayChangu collection fee is absorbed by platform and NOT deducted from organizer.
 */
export async function calculatePrimaryOrderFees(unitPrice: number, quantity: number) {
  const grossTicketTotal = Number(unitPrice) * Number(quantity);
  const buyerFee = 0;
  const buyerTotal = grossTicketTotal;

  // Platform fee: 8%
  const platformCommission = Math.round((grossTicketTotal * (PLATFORM_FEE_PERCENT / 100)) * 100) / 100;
  // Organizer balance: 92%
  const netOrganizerEarnings = Math.max(0, Math.round((grossTicketTotal - platformCommission) * 100) / 100);

  return {
    grossTicketTotal,
    buyerFee,
    buyerTotal,
    platformCommission,
    netOrganizerEarnings,
  };
}

export async function calculateResaleFees(resalePrice: number) {
  const schedule = await getActiveFeeSchedule();
  const price = Number(resalePrice);
  const platformCommission = Math.round((price * (schedule.resaleFeePercent / 100)) * 100) / 100;
  const netResellerEarnings = Math.max(0, Math.round((price - platformCommission) * 100) / 100);

  return {
    resalePrice: price,
    platformCommission,
    netResellerEarnings,
  };
}

/**
 * Calculates PayChangu Bank Payout Fee for Organizer Settlement.
 * STRICT RULE: Bank Transfer ONLY.
 * Formula: payoutFee = (payoutAmount * 0.017) + 700
 * netPayout = payoutAmount - payoutFee
 */
export async function calculatePayoutFees(requestedAmount: number) {
  const amount = Number(requestedAmount);

  // Bank payout fee: 1.7% + MWK 700
  const percentageFee = Math.round((amount * (BANK_PAYOUT_PERCENT / 100)) * 100) / 100;
  const fixedFee = BANK_PAYOUT_FIXED_FEE;
  const payoutFee = Math.round((percentageFee + fixedFee) * 100) / 100;
  const netPayoutAmount = Math.max(0, Math.round((amount - payoutFee) * 100) / 100);

  return {
    requestedAmount: amount,
    percentageFee,
    fixedFee,
    payoutFee,
    netPayoutAmount,
    method: 'BANK_TRANSFER' as const,
  };
}

export async function calculateRefundFees(refundAmount: number) {
  const schedule = await getActiveFeeSchedule();
  const amount = Number(refundAmount);
  const refundFee = Math.min(amount, schedule.refundFeeFixed);
  const netRefundAmount = Math.max(0, Math.round((amount - refundFee) * 100) / 100);

  return {
    refundAmount: amount,
    refundFee,
    netRefundAmount,
  };
}
