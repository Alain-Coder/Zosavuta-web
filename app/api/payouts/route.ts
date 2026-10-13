import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser, hasRecentAuthentication } from '@/lib/auth-server';
import { getPayoutEligibility, releaseEligiblePendingBalances } from '@/lib/payout-eligibility';
import { getVerificationByUserId } from '@/lib/organizer-verification';
import { calculatePayoutFees, calculateMobilePayoutFees, BANK_PAYOUT_PERCENT, BANK_PAYOUT_FIXED_FEE, AIRTEL_PAYOUT_PERCENT, TNM_PAYOUT_PERCENT } from '@/lib/fees';
import { AIRTEL_MONEY_BANK_UUID, TNM_MPAMBA_BANK_UUID } from '@/lib/paychangu-payouts';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Conclude ended events from yesterday and release available balance
  await releaseEligiblePendingBalances();

  const balances = await query(
    'SELECT pendingBalance, availableBalance, paidOutBalance, currency FROM seller_balances WHERE sellerId = ?',
    [user.uid]
  );
  const rows = await query(
    'SELECT * FROM payout_requests WHERE sellerId = ? ORDER BY createdAt DESC',
    [user.uid]
  );

  // Look up user's resold ticket listings
  const resaleRows = await query<any>(
    `SELECT r.id, r.price, r.status, r.createdAt, r.soldAt, e.title as eventTitle, e.date as eventDate
     FROM resale_listings r
     LEFT JOIN events e ON r.eventId = e.legacyId
     WHERE r.sellerId = ?
     ORDER BY r.createdAt DESC`,
    [user.uid]
  );

  // Look up verified organizer bank details
  const verification = await getVerificationByUserId(user.uid);
  const rawPayoutDetails = verification
    ? (verification.businessType === 'registered'
      ? (verification.businessPayoutDetails || verification.individualPayoutDetails)
      : (verification.individualPayoutDetails || verification.businessPayoutDetails))
    : null;

  const verifiedBank = rawPayoutDetails && rawPayoutDetails.accountNumber ? {
    bankName: rawPayoutDetails.bankName || '',
    accountNumber: rawPayoutDetails.accountNumber || '',
    accountName: rawPayoutDetails.accountName || verification?.legalName || verification?.businessName || user.fullName || '',
  } : null;

  return NextResponse.json({
    balance: balances[0] || { pendingBalance: 0, availableBalance: 0, paidOutBalance: 0, currency: 'MWK' },
    payouts: rows.map((r: any) => ({
      ...r,
      payoutDetails: r.payoutDetails ? (typeof r.payoutDetails === 'string' ? JSON.parse(r.payoutDetails) : r.payoutDetails) : null,
    })),
    resaleTickets: resaleRows,
    verifiedBank,
    kycApproved: verification?.status === 'APPROVED',
    feeSchedule: {
      bankPayoutPercent: BANK_PAYOUT_PERCENT,
      bankPayoutFixedFee: BANK_PAYOUT_FIXED_FEE,
      airtelPayoutPercent: AIRTEL_PAYOUT_PERCENT,
      tnmPayoutPercent: TNM_PAYOUT_PERCENT,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'An eligible seller or organizer account is required' }, { status: 403 });
  }
  if (!hasRecentAuthentication(user)) {
    return NextResponse.json(
      { error: 'For your security, sign in again before requesting a payout.', code: 'RECENT_AUTH_REQUIRED' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });
  }

  const method = String(body.method).toUpperCase();

  // ── 1. MOBILE MONEY PAYOUT FOR ATTENDEE RESALE TICKETS ──
  if (method === 'MOBILE_MONEY') {
    const operator = body.operator;
    const isAirtel = String(operator).toUpperCase().includes('AIRTEL');
    const isTnm = String(operator).toUpperCase().includes('TNM') || String(operator).toLowerCase().includes('MPAMBA');

    if (!isAirtel && !isTnm) {
      return NextResponse.json({
        error: 'Please select a valid mobile money operator: Airtel Money or TNM Mpamba.',
      }, { status: 400 });
    }

    const operatorName = isAirtel ? 'Airtel Money' : 'Tnm Mpamba';
    const phoneNumber = String(body.phoneNumber || '').trim().replace(/[\s-]/g, '');

    if (!phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required before requesting mobile money payout.',
      }, { status: 400 });
    }

    const phoneDigits = phoneNumber.replace(/^\+?265/, '').replace(/^0/, '');
    if (phoneDigits.length !== 9 || !/^\d{9}$/.test(phoneDigits)) {
      return NextResponse.json({
        error: 'Invalid Malawi mobile number. Please enter a 9 or 10 digit number (e.g., 099xxxxxxx or 088xxxxxxx).',
      }, { status: 400 });
    }

    if (isAirtel && !phoneDigits.startsWith('9')) {
      return NextResponse.json({
        error: 'Airtel Money numbers must begin with 09 (e.g. 099... or 098...).',
      }, { status: 400 });
    }
    if (isTnm && !phoneDigits.startsWith('8')) {
      return NextResponse.json({
        error: 'TNM Mpamba numbers must begin with 08 (e.g. 088...).',
      }, { status: 400 });
    }

    const standardPhone = `0${phoneDigits}`;
    const fees = calculateMobilePayoutFees(amount, operatorName);

    if (amount <= fees.payoutFee) {
      return NextResponse.json({
        error: `Payout amount must be greater than the mobile money withdrawal fee of MWK ${fees.payoutFee.toLocaleString()}.`,
      }, { status: 400 });
    }

    const payoutId = `PAY-MM-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [balanceRows] = await conn.execute(
        'SELECT availableBalance FROM seller_balances WHERE sellerId = ? FOR UPDATE',
        [user.uid]
      );
      const available = Number((balanceRows as { availableBalance: number }[])[0]?.availableBalance || 0);
      if (amount > available) {
        await conn.rollback();
        return NextResponse.json({
          error: `Insufficient available balance. Your available balance is MWK ${available.toLocaleString()}.`,
        }, { status: 400 });
      }

      const bankUuid = isAirtel ? AIRTEL_MONEY_BANK_UUID : TNM_MPAMBA_BANK_UUID;
      const payoutDetails = {
        method: 'MOBILE_MONEY',
        operator: operatorName,
        bankUuid,
        phoneNumber: standardPhone,
        accountName: user.fullName || 'Attendee',
        payoutFeePercent: fees.percent,
        feeAmount: fees.payoutFee,
        netAmount: fees.netPayoutAmount,
      };

      await conn.execute(
        `INSERT INTO payout_requests (id, sellerId, amount, status, payoutDetails, feeAmount, netAmount) 
         VALUES (?, ?, ?, 'ACCOUNTANT_REVIEW', ?, ?, ?)`,
        [
          payoutId,
          user.uid,
          amount,
          JSON.stringify(payoutDetails),
          fees.payoutFee,
          fees.netPayoutAmount,
        ]
      );

      // Reserve requested funds from available balance
      await conn.execute(
        'UPDATE seller_balances SET availableBalance = availableBalance - ? WHERE sellerId = ?',
        [amount, user.uid]
      );

      await conn.commit();
      return NextResponse.json({
        id: payoutId,
        status: 'ACCOUNTANT_REVIEW',
        amount,
        feeAmount: fees.payoutFee,
        netAmount: fees.netPayoutAmount,
        payoutDetails,
        message: `Payout request for MWK ${amount.toLocaleString()} submitted for admin review. Net: MWK ${fees.netPayoutAmount.toLocaleString()} after withdrawal fee.`,
      }, { status: 201 });
    } catch (error) {
      await conn.rollback();
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Payout request failed',
      }, { status: 500 });
    } finally {
      conn.release();
    }
  }

  // ── 2. ORGANIZER BANK TRANSFER (STRICT: Bank Transfer Only per payouts.md) ──
  const verification = await getVerificationByUserId(user.uid);
  if (!verification || verification.status !== 'APPROVED') {
    return NextResponse.json({
      error: 'Organizer verification required. Your account must be approved before receiving seller payouts.',
    }, { status: 403 });
  }

  const rawPayoutDetails = verification.businessType === 'registered'
    ? (verification.businessPayoutDetails || verification.individualPayoutDetails)
    : (verification.individualPayoutDetails || verification.businessPayoutDetails);

  if (!rawPayoutDetails || !rawPayoutDetails.accountNumber || !rawPayoutDetails.bankName) {
    return NextResponse.json({
      error: 'Verified bank transfer details (Bank Name and Account Number) are required for organizer payouts.',
    }, { status: 400 });
  }

  const eligibility = await getPayoutEligibility(user.uid);
  if (!eligibility.eligible || amount > eligibility.availableBalance) {
    return NextResponse.json({ error: eligibility.reason || 'Insufficient available balance' }, { status: 400 });
  }

  // Calculate PayChangu bank payout fee: (payoutAmount * 0.017) + 700
  const fees = await calculatePayoutFees(amount);
  if (amount <= fees.payoutFee) {
    return NextResponse.json({
      error: `Payout amount must be greater than the bank payout fee of MWK ${fees.payoutFee.toLocaleString()}.`,
    }, { status: 400 });
  }

  const recipientBank = {
    method: 'BANK_TRANSFER',
    bankName: rawPayoutDetails.bankName,
    accountNumber: rawPayoutDetails.accountNumber,
    accountName: rawPayoutDetails.accountName || verification.legalName || verification.businessName || user.fullName || 'Organizer',
  };

  const payoutId = `PAY-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [balanceRows] = await conn.execute(
      'SELECT availableBalance FROM seller_balances WHERE sellerId = ? FOR UPDATE',
      [user.uid]
    );
    const available = Number((balanceRows as { availableBalance: number }[])[0]?.availableBalance || 0);
    if (amount > available) {
      await conn.rollback();
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 409 });
    }

    await conn.execute(
      `INSERT INTO payout_requests (id, sellerId, amount, status, payoutDetails, feeAmount, netAmount) 
       VALUES (?, ?, ?, 'ACCOUNTANT_REVIEW', ?, ?, ?)`,
      [
        payoutId,
        user.uid,
        amount,
        JSON.stringify(recipientBank),
        fees.payoutFee,
        fees.netPayoutAmount,
      ]
    );

    // Reserve requested funds from available balance
    await conn.execute(
      'UPDATE seller_balances SET availableBalance = availableBalance - ? WHERE sellerId = ?',
      [amount, user.uid]
    );

    await conn.commit();
    return NextResponse.json({
      id: payoutId,
      status: 'ACCOUNTANT_REVIEW',
      amount,
      feeAmount: fees.payoutFee,
      netAmount: fees.netPayoutAmount,
      recipientBank,
      message: `Payout request for MWK ${amount.toLocaleString()} submitted for admin review. Net bank transfer: MWK ${fees.netPayoutAmount.toLocaleString()} after withdrawal fee.`,
    }, { status: 201 });
  } catch (error) {
    await conn.rollback();
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Payout request failed',
    }, { status: 500 });
  } finally {
    conn.release();
  }
}