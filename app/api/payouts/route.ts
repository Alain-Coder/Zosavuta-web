import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { getPayoutEligibility, releaseEligiblePendingBalances } from '@/lib/payout-eligibility';
import { getVerificationByUserId } from '@/lib/organizer-verification';
import { calculatePayoutFees, BANK_PAYOUT_PERCENT, BANK_PAYOUT_FIXED_FEE } from '@/lib/fees';
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
    verifiedBank,
    kycApproved: verification?.status === 'APPROVED',
    feeSchedule: {
      bankPayoutPercent: BANK_PAYOUT_PERCENT,
      bankPayoutFixedFee: BANK_PAYOUT_FIXED_FEE,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'An eligible seller or organizer account is required' }, { status: 403 });
  }

  const amount = Number((await req.json().catch(() => ({}))).amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });
  }

  // Check verified organizer KYC and bank details (STRICT: Bank Transfer Only per payouts.md)
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
      message: `Payout request for MWK ${amount.toLocaleString()} submitted for admin review. Net bank transfer: MWK ${fees.netPayoutAmount.toLocaleString()} after PayChangu fee.`,
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