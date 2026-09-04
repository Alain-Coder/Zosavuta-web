import pool, { query } from '@/lib/db';
import { calculatePayoutFees } from '@/lib/fees';

const PAYCHANGU_BASE_URL = 'https://api.paychangu.com';

export interface PayoutRecipientDetails {
  mobileNumber?: string;
  mobileOperator?: string; // 'TNM' | 'AIRTEL'
  accountNumber?: string;
  bankCode?: string;
  recipientName: string;
}

export async function processPayoutWithProvider(
  payoutId: string,
  sellerId: string,
  amount: number,
  recipient: PayoutRecipientDetails
) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu secret key is not configured');

  const feeDetails = await calculatePayoutFees(amount);
  const netTransferAmount = feeDetails.netPayoutAmount;
  const providerRef = `POUT-${payoutId.slice(-8)}-${Date.now()}`;

  // Reserve/deduct balance from available pool during processing
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT availableBalance FROM seller_balances WHERE sellerId = ? FOR UPDATE',
      [sellerId]
    );
    const available = Number((rows as any[])[0]?.availableBalance || 0);
    if (available < amount) {
      throw new Error(`Insufficient available balance for payout. Available: MWK ${available}`);
    }

    await conn.execute(
      `UPDATE seller_balances SET availableBalance = availableBalance - ? WHERE sellerId = ?`,
      [amount, sellerId]
    );

    await conn.execute(
      `UPDATE payout_requests SET status = 'PROCESSING', providerReference = ? WHERE id = ?`,
      [providerRef, payoutId]
    );

    await conn.commit();
  } catch (dbErr) {
    await conn.rollback();
    throw dbErr;
  } finally {
    conn.release();
  }

  // Call PayChangu Mobile Money / Settlement payout API
  try {
    const endpoint = recipient.mobileNumber
      ? `${PAYCHANGU_BASE_URL}/mobile-money/transfer`
      : `${PAYCHANGU_BASE_URL}/bank/transfer`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: netTransferAmount,
        currency: 'MWK',
        mobile_number: recipient.mobileNumber,
        operator: recipient.mobileOperator || 'AIRTEL',
        charge_id: providerRef,
        recipient_name: recipient.recipientName,
        account_number: recipient.accountNumber,
        bank_code: recipient.bankCode,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://zosavuta.com'}/api/payouts/webhook`,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || (data?.status !== 'success' && data?.status !== 'pending')) {
      throw new Error(data?.message || 'PayChangu payout provider rejected transfer request');
    }

    return {
      success: true,
      providerReference: providerRef,
      data,
    };
  } catch (providerErr: any) {
    // Restore seller available balance on provider connection failure
    await query(
      `UPDATE seller_balances SET availableBalance = availableBalance + ? WHERE sellerId = ?`,
      [amount, sellerId]
    );
    await query(
      `UPDATE payout_requests SET status = 'FAILED' WHERE id = ?`,
      [payoutId]
    );
    throw providerErr;
  }
}
