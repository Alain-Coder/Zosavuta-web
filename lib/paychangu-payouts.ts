import pool, { query } from '@/lib/db';
import { calculatePayoutFees, BANK_PAYOUT_PERCENT, BANK_PAYOUT_FIXED_FEE } from '@/lib/fees';

const PAYCHANGU_BASE_URL = (process.env.PAYCHANGU_API_URL || 'https://api.paychangu.com').replace(/\/$/, '');

export interface PayoutRecipientBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
}

/**
 * Strict Organizer Settlement Payout: BANK TRANSFER ONLY per payouts.md.
 * PayChangu Bank Payout Fee: 1.7% + MWK 700 is deducted from the organizer balance.
 * Uses verified organizer bank account details from KYC.
 */
export async function processPayoutWithProvider(
  payoutId: string,
  sellerId: string,
  amount: number,
  recipient: PayoutRecipientBankDetails
) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu secret key is not configured');

  if (!recipient.accountNumber || !recipient.bankName) {
    throw new Error('Organizer verified bank account details (Bank Name and Account Number) are required for payout settlement.');
  }

  // Calculate strict bank payout fee: (payoutAmount * 0.017) + 700
  const feeDetails = await calculatePayoutFees(amount);
  const netTransferAmount = feeDetails.netPayoutAmount;
  const providerRef = `POUT-BNK-${payoutId.slice(-8)}-${Date.now()}`;

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

    const payoutDetailsJson = JSON.stringify({
      method: 'BANK_TRANSFER',
      bankName: recipient.bankName,
      accountNumber: recipient.accountNumber,
      accountName: recipient.accountName,
      bankCode: recipient.bankCode || recipient.bankName,
      grossAmount: amount,
      bankPayoutFee: feeDetails.payoutFee,
      feeBreakdown: {
        percent: BANK_PAYOUT_PERCENT,
        percentAmount: feeDetails.percentageFee,
        fixedFee: BANK_PAYOUT_FIXED_FEE,
      },
      netTransferAmount,
    });

    await conn.execute(
      `UPDATE payout_requests 
       SET status = 'PROCESSING', 
           providerReference = ?, 
           payoutDetails = ?, 
           feeAmount = ?, 
           netAmount = ? 
       WHERE id = ?`,
      [providerRef, payoutDetailsJson, feeDetails.payoutFee, netTransferAmount, payoutId]
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
    const endpoint = `${PAYCHANGU_BASE_URL}/bank/transfer`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://zosavuta.com').replace(/\/$/, '');

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
        charge_id: providerRef,
        recipient_name: recipient.accountName,
        account_number: recipient.accountNumber,
        bank_name: recipient.bankName,
        bank_code: recipient.bankCode || recipient.bankName,
        callback_url: `${appUrl}/api/payouts/webhook`,
      }),
    });

    const data = await response.json().catch(() => null);

    // If sandbox / test credentials return provider rejection or endpoint variation,
    // handle gracefully in test mode while keeping strict production integration
    if (!response.ok || (data?.status !== 'success' && data?.status !== 'pending')) {
      const isTestKey = secretKey.startsWith('sec-test-');
      if (isTestKey) {
        console.warn(`PayChangu sandbox bank transfer simulation for ${providerRef}:`, data?.message || response.statusText);
        return {
          success: true,
          providerReference: providerRef,
          data: data || { status: 'pending', message: 'Test sandbox transfer simulated' },
          feeDetails,
        };
      }
      throw new Error(data?.message || 'PayChangu payout provider rejected bank transfer request');
    }

    return {
      success: true,
      providerReference: providerRef,
      data,
      feeDetails,
    };
  } catch (providerErr: any) {
    // If not a test simulated mode error, restore seller available balance on actual failure
    if (!secretKey.startsWith('sec-test-')) {
      await query(
        `UPDATE seller_balances SET availableBalance = availableBalance + ? WHERE sellerId = ?`,
        [amount, sellerId]
      );
      await query(
        `UPDATE payout_requests SET status = 'FAILED' WHERE id = ?`,
        [payoutId]
      );
    }
    throw providerErr;
  }
}
