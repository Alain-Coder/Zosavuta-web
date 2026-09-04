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

const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  name: 'DEFAULT_FALLBACK',
  buyerFeePercent: 5.0,
  buyerFeeFixed: 100.0,
  organizerFeePercent: 7.0,
  resaleFeePercent: 10.0,
  payoutFeeFixed: 500.0,
  payoutFeePercent: 0.0,
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
        buyerFeePercent: Number(rows[0].buyerFeePercent),
        buyerFeeFixed: Number(rows[0].buyerFeeFixed),
        organizerFeePercent: Number(rows[0].organizerFeePercent),
        resaleFeePercent: Number(rows[0].resaleFeePercent),
        payoutFeeFixed: Number(rows[0].payoutFeeFixed),
        payoutFeePercent: Number(rows[0].payoutFeePercent),
        refundFeeFixed: Number(rows[0].refundFeeFixed),
      };
    }
  } catch (error) {
    console.warn('Fee schedule query fallback to defaults:', error);
  }
  return DEFAULT_FEE_SCHEDULE;
}

export async function calculatePrimaryOrderFees(unitPrice: number, quantity: number) {
  const schedule = await getActiveFeeSchedule();
  const grossTicketTotal = Number(unitPrice) * Number(quantity);
  const buyerFee = Math.round(((grossTicketTotal * (schedule.buyerFeePercent / 100)) + (schedule.buyerFeeFixed * quantity)) * 100) / 100;
  const buyerTotal = grossTicketTotal + buyerFee;
  const platformCommission = Math.round((grossTicketTotal * (schedule.organizerFeePercent / 100)) * 100) / 100;
  const netOrganizerEarnings = Math.max(0, grossTicketTotal - platformCommission);

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
  const netResellerEarnings = Math.max(0, price - platformCommission);

  return {
    resalePrice: price,
    platformCommission,
    netResellerEarnings,
  };
}

export async function calculatePayoutFees(requestedAmount: number) {
  const schedule = await getActiveFeeSchedule();
  const amount = Number(requestedAmount);
  const payoutFee = Math.round((schedule.payoutFeeFixed + (amount * (schedule.payoutFeePercent / 100))) * 100) / 100;
  const netPayoutAmount = Math.max(0, amount - payoutFee);

  return {
    requestedAmount: amount,
    payoutFee,
    netPayoutAmount,
  };
}

export async function calculateRefundFees(refundAmount: number) {
  const schedule = await getActiveFeeSchedule();
  const amount = Number(refundAmount);
  const refundFee = Math.min(amount, schedule.refundFeeFixed);
  const netRefundAmount = Math.max(0, amount - refundFee);

  return {
    refundAmount: amount,
    refundFee,
    netRefundAmount,
  };
}
