import pool, { query } from '@/lib/db';
import { calculatePayoutFees, calculateMobilePayoutFees, BANK_PAYOUT_PERCENT, BANK_PAYOUT_FIXED_FEE } from '@/lib/fees';

const PAYCHANGU_BASE_URL = (process.env.PAYCHANGU_API_URL || 'https://api.paychangu.com').replace(/\/$/, '');

export interface PayChanguSupportedBank {
  uuid: string;
  name: string;
}

export interface PayoutRecipientBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
  bankUuid?: string;
}

let cachedBanks: { data: PayChanguSupportedBank[]; expiresAt: number } | null = null;

/**
 * Retrieve supported banks dynamically from PayChangu Get Banks API:
 * GET https://api.paychangu.com/direct-charge/payouts/supported-banks?currency=MWK
 * Caches in memory for 1 hour to avoid excessive external API requests.
 */
export async function getSupportedBanks(includeMobile = false): Promise<PayChanguSupportedBank[]> {
  const now = Date.now();
  if (cachedBanks && cachedBanks.expiresAt > now) {
    return includeMobile
      ? cachedBanks.data
      : cachedBanks.data.filter(
          (b) =>
            !b.name.toLowerCase().includes('airtel') &&
            !b.name.toLowerCase().includes('tnm') &&
            !b.name.toLowerCase().includes('mpamba')
        );
  }

  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  const endpoint = `${PAYCHANGU_BASE_URL}/direct-charge/payouts/supported-banks?currency=MWK`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.status === 'success' && Array.isArray(json?.data)) {
        cachedBanks = { data: json.data, expiresAt: now + 60 * 60 * 1000 };
        return includeMobile
          ? json.data
          : json.data.filter(
              (b: PayChanguSupportedBank) =>
                !b.name.toLowerCase().includes('airtel') &&
                !b.name.toLowerCase().includes('tnm') &&
                !b.name.toLowerCase().includes('mpamba')
            );
      }
    }
  } catch (err) {
    console.warn('Failed to fetch PayChangu supported banks from API, using fallback list:', err);
  }

  // Fallback if network or sandbox issue
  const fallbackBanks: PayChanguSupportedBank[] = [
    { uuid: '82310dd1-ec9b-4fe7-a32c-2f262ef08681', name: 'National Bank of Malawi' },
    { uuid: '87e62436-0553-4fb5-a76d-f27d28420c5b', name: 'Ecobank Malawi Limited' },
    { uuid: 'b064172a-8a1b-4f7f-aad7-81b036c46c57', name: 'FDH Bank Limited' },
    { uuid: 'e7447c2c-c147-4907-b194-e087fe8d8585', name: 'Standard Bank Limited' },
    { uuid: '236760c9-3045-4a01-990e-497b28d115bb', name: 'Centenary Bank' },
    { uuid: '968ac588-3b1f-4d89-81ff-a3d43a599003', name: 'First Capital Limited' },
    { uuid: 'c759d7b6-ae5c-4a95-814a-79171271897a', name: 'CDH Investment Bank' },
    { uuid: '86007bf5-1b04-49ba-84c1-9758bbf5c996', name: 'NBS Bank Limited' },
  ];

  return fallbackBanks;
}

/**
 * Retrieve payout details from PayChangu:
 * GET https://api.paychangu.com/direct-charge/payouts/{charge_id}/details
 */
export async function getPayChanguPayoutDetails(chargeId: string) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu secret key is not configured');

  const endpoint = `${PAYCHANGU_BASE_URL}/direct-charge/payouts/${encodeURIComponent(chargeId)}/details`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch payout details from PayChangu: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Strict Organizer Settlement Payout: BANK TRANSFER ONLY per PAYCHANGU_BANK_CODES_AND_PAYOUTS.md.
 * PayChangu Bank Payout Fee: 1.7% + MWK 700 is deducted from the organizer balance.
 * Uses verified organizer bank account details and PayChangu bank_uuid.
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

  // Resolve bank_uuid from recipient or from PayChangu Get Banks API
  let bankUuid = recipient.bankUuid;
  if (!bankUuid) {
    const supportedBanks = await getSupportedBanks(false);
    const matched = supportedBanks.find(
      (b) =>
        b.name.toLowerCase() === recipient.bankName.toLowerCase() ||
        b.name.toLowerCase().includes(recipient.bankName.toLowerCase()) ||
        recipient.bankName.toLowerCase().includes(b.name.toLowerCase())
    );
    if (matched) {
      bankUuid = matched.uuid;
    }
  }

  if (!bankUuid) {
    throw new Error(
      `Could not determine PayChangu bank_uuid for "${recipient.bankName}". Please verify that this institution is supported.`
    );
  }

  // Calculate strict bank payout fee: (payoutAmount * 0.017) + 700
  const feeDetails = await calculatePayoutFees(amount);
  const netTransferAmount = feeDetails.netPayoutAmount;
  const providerRef = `POUT-BNK-${payoutId.slice(-8)}-${Date.now()}`;

  // Reserve/deduct balance from available pool during processing
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [payoutRows] = await conn.execute(
      'SELECT id, status, amount FROM payout_requests WHERE id = ? FOR UPDATE',
      [payoutId]
    );
    const existingPayout = (payoutRows as any[])[0];
    const isAlreadyReserved = existingPayout && ['ACCOUNTANT_REVIEW', 'REQUESTED', 'APPROVED', 'PROCESSING'].includes(existingPayout.status);

    if (!isAlreadyReserved) {
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
    }

    const payoutDetailsJson = JSON.stringify({
      method: 'BANK_TRANSFER',
      bankName: recipient.bankName,
      bankUuid,
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

  // Call PayChangu Bank Payout Initialize API (POST /direct-charge/payouts/initialize)
  try {
    const endpoint = `${PAYCHANGU_BASE_URL}/direct-charge/payouts/initialize`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        payout_method: 'bank_transfer',
        bank_uuid: bankUuid,
        amount: netTransferAmount,
        charge_id: providerRef,
        bank_account_name: recipient.accountName,
        bank_account_number: recipient.accountNumber,
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

export const AIRTEL_MONEY_BANK_UUID = 'e8d5fca0-e5ac-4714-a518-484be9011326';
export const TNM_MPAMBA_BANK_UUID = '5e9946ae-76ed-43f5-ad59-63e09096006a';

export interface MobileMoneyPayoutDetails {
  operator: 'Airtel Money' | 'Tnm Mpamba' | string;
  phoneNumber: string;
  accountName?: string;
  bankUuid?: string;
}

/**
 * Mobile Money Disbursement for Attendee Resale Ticket Payouts.
 * Uses PayChangu bank_uuid for Airtel Money / TNM Mpamba.
 * Airtel Money fee: 1.8% | TNM Mpamba fee: 1.5%
 *
 * Pre-flight safety check: verifies the sold resale listing's ticket
 * has already been transferred to the buyer (currentOwnerId != sellerId)
 * before funds are released to the original seller.
 */
export async function processMobileMoneyPayoutWithProvider(
  payoutId: string,
  sellerId: string,
  amount: number,
  recipient: MobileMoneyPayoutDetails
) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu secret key is not configured');

  if (!recipient.phoneNumber) {
    throw new Error('Mobile Money phone number is required for attendee resale payout.');
  }

  const isAirtel = String(recipient.operator).toUpperCase().includes('AIRTEL');
  const operatorName = isAirtel ? 'Airtel Money' : 'Tnm Mpamba';
  const network = isAirtel ? 'AIRTEL' : 'TNM';

  // ── Resolve PayChangu bank_uuid for Mobile Money operator ──
  let bankUuid = recipient.bankUuid;
  if (!bankUuid) {
    const allBanks = await getSupportedBanks(true);
    const matched = allBanks.find(
      (b) =>
        b.name.toLowerCase().includes(isAirtel ? 'airtel' : 'mpamba') ||
        b.name.toLowerCase().includes(isAirtel ? 'airtel' : 'tnm')
    );
    bankUuid = matched?.uuid || (isAirtel ? AIRTEL_MONEY_BANK_UUID : TNM_MPAMBA_BANK_UUID);
  }

  // ── Pre-flight: verify the resale ticket has been transferred to the buyer ──
  const resaleCheck = await query<{
    id: string;
    ticketId: number | null;
    status: string;
    ticketCurrentOwner: string | null;
  }>(
    `SELECT rl.id, rl.ticketId, rl.status,
            ot.currentOwnerId AS ticketCurrentOwner
     FROM payout_requests pr
     JOIN resale_listings rl ON rl.sellerId = pr.sellerId AND rl.status = 'SOLD'
     LEFT JOIN order_tickets ot ON ot.id = rl.ticketId
     WHERE pr.id = ?
     ORDER BY rl.soldAt DESC
     LIMIT 1`,
    [payoutId]
  );

  if (resaleCheck.length > 0) {
    const listing = resaleCheck[0];
    // If ticket still has seller as owner, the transfer has not completed — block payout
    if (listing.ticketId && listing.ticketCurrentOwner === sellerId) {
      throw new Error(
        'Payout blocked: the resale ticket has not yet been transferred to the buyer. ' +
        'Ticket ownership must be updated before releasing seller funds.'
      );
    }
  }

  const feeDetails = calculateMobilePayoutFees(amount, operatorName);
  const netTransferAmount = feeDetails.netPayoutAmount;
  const providerRef = `POUT-MM-${payoutId.slice(-8)}-${Date.now()}`;

  // ── Reserve balance from available pool during processing ──
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [payoutRows] = await conn.execute(
      'SELECT id, status, amount FROM payout_requests WHERE id = ? FOR UPDATE',
      [payoutId]
    );
    const existingPayout = (payoutRows as any[])[0];
    const isAlreadyReserved = existingPayout && ['ACCOUNTANT_REVIEW', 'REQUESTED', 'APPROVED', 'PROCESSING'].includes(existingPayout.status);

    if (!isAlreadyReserved) {
      const [rows] = await conn.execute(
        'SELECT availableBalance FROM seller_balances WHERE sellerId = ? FOR UPDATE',
        [sellerId]
      );
      const available = Number((rows as { availableBalance: number }[])[0]?.availableBalance || 0);
      if (available < amount) {
        throw new Error(`Insufficient available balance. Available: MWK ${available.toLocaleString()}`);
      }

      await conn.execute(
        `UPDATE seller_balances SET availableBalance = availableBalance - ? WHERE sellerId = ?`,
        [amount, sellerId]
      );
    }

    const payoutDetailsJson = JSON.stringify({
      method: 'MOBILE_MONEY',
      operator: operatorName,
      network,
      bankUuid,
      phoneNumber: recipient.phoneNumber,
      accountName: recipient.accountName || 'Attendee',
      grossAmount: amount,
      mobilePayoutFee: feeDetails.payoutFee,
      feePercent: feeDetails.percent,
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

  // ── Call PayChangu Payout API with Mobile Money bank_uuid ──
  const secretKeyStr = String(secretKey);
  try {
    const endpoint = `${PAYCHANGU_BASE_URL}/direct-charge/payouts/initialize`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKeyStr}`,
      },
      body: JSON.stringify({
        payout_method: 'mobile_money',
        bank_uuid: bankUuid,
        amount: netTransferAmount,
        charge_id: providerRef,
        bank_account_name: recipient.accountName || 'Attendee',
        bank_account_number: recipient.phoneNumber,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || (data?.status !== 'success' && data?.status !== 'pending')) {
      const isTestKey = secretKeyStr.startsWith('sec-test-');
      if (isTestKey) {
        console.warn(`PayChangu sandbox mobile money simulation for ${providerRef}:`, data?.message || response.statusText);
        return {
          success: true,
          providerReference: providerRef,
          data: data || { status: 'pending', message: 'Test sandbox mobile money transfer simulated' },
          feeDetails,
        };
      }
      throw new Error(data?.message || 'PayChangu payout provider rejected mobile money transfer request');
    }

    return {
      success: true,
      providerReference: providerRef,
      data,
      feeDetails,
    };
  } catch (providerErr: any) {
    if (!secretKeyStr.startsWith('sec-test-')) {
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
