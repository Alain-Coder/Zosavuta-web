import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { checkAndRegisterDualApproval, AdminRole } from '@/lib/security-controls';
import { processPayoutWithProvider, processMobileMoneyPayoutWithProvider } from '@/lib/paychangu-payouts';
import { getVerificationByUserId } from '@/lib/organizer-verification';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(
    await query(`
      SELECT pr.*,
             u.fullName  AS sellerName,
             u.email     AS sellerEmail
      FROM payout_requests pr
      LEFT JOIN users u ON u.uid = pr.sellerId
      ORDER BY pr.createdAt DESC
    `)
  );
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, status, reason, recipientDetails } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });

  const payouts = await query<{ sellerId: string; amount: number; status: string; payoutDetails: string | null }>(
    'SELECT sellerId, amount, status, payoutDetails FROM payout_requests WHERE id = ?',
    [id]
  );
  if (!payouts.length) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
  const payout = payouts[0];
  if (payout.status === 'COMPLETED' || payout.status === 'CANCELLED') return NextResponse.json({ error: 'Payout is already final' }, { status: 409 });

  const adminRole: AdminRole = user.adminRole || (user.role === 'admin' ? 'SYSTEM_ADMINISTRATOR' : 'ACCOUNTANT');
  const amount = Number(payout.amount);

  if (status === 'APPROVED' || status === 'COMPLETED') {
    // Enforce Segregation of Duties & Dual Approval
    const segregationCheck = await checkAndRegisterDualApproval(
      user.uid,
      adminRole,
      'PAYOUT_APPROVAL',
      'PAYOUT_REQUEST',
      id,
      amount,
      payout.sellerId
    );

    if (!segregationCheck.allowed) {
      return NextResponse.json(
        {
          error: segregationCheck.reason,
          dualApprovalPending: segregationCheck.dualApprovalPending,
        },
        { status: 403 }
      );
    }

    // Parse stored payout details to determine method
    let storedDetails: Record<string, any> = {};
    if (payout.payoutDetails) {
      try {
        storedDetails = typeof payout.payoutDetails === 'string'
          ? JSON.parse(payout.payoutDetails)
          : payout.payoutDetails;
      } catch {
        // fall through — treat as bank transfer
      }
    }

    const isMobileMoney =
      storedDetails.method === 'MOBILE_MONEY' ||
      Boolean(storedDetails.phoneNumber) ||
      (recipientDetails?.method === 'MOBILE_MONEY');

    if (isMobileMoney) {
      // ── Mobile Money Payout: Attendee Resale Ticket Earnings ──
      const operator = storedDetails.operator || recipientDetails?.operator || 'Airtel Money';
      const phoneNumber = storedDetails.phoneNumber || recipientDetails?.phoneNumber;
      const accountName = storedDetails.accountName || recipientDetails?.accountName;
      const bankUuid = storedDetails.bankUuid || recipientDetails?.bankUuid;

      if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number is required for mobile money payout' }, { status: 400 });
      }

      try {
        const dispatchResult = await processMobileMoneyPayoutWithProvider(
          id,
          payout.sellerId,
          amount,
          { operator, phoneNumber, accountName, bankUuid }
        );
        return NextResponse.json({
          id,
          status: 'PROCESSING',
          method: 'MOBILE_MONEY',
          operator,
          phoneNumber,
          providerReference: dispatchResult.providerReference,
          netAmount: dispatchResult.feeDetails.netPayoutAmount,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Mobile money payout failed' }, { status: 500 });
      }
    }

    // ── Bank Transfer Payout: Organizer Settlement ──
    const verif = await getVerificationByUserId(payout.sellerId);
    const rawBank = verif
      ? (verif.businessType === 'registered'
          ? (verif.businessPayoutDetails || verif.individualPayoutDetails)
          : (verif.individualPayoutDetails || verif.businessPayoutDetails))
      : null;

    const bankName = storedDetails?.bankName || rawBank?.bankName || recipientDetails?.bankName;
    const bankUuid = storedDetails?.bankUuid || rawBank?.bankUuid || recipientDetails?.bankUuid;
    const accountNumber = storedDetails?.accountNumber || rawBank?.accountNumber || recipientDetails?.accountNumber;
    const accountName = storedDetails?.accountName || rawBank?.accountName || recipientDetails?.accountName || verif?.legalName || verif?.businessName || 'Organizer';

    if (!bankName || !accountNumber) {
      return NextResponse.json({
        error: 'Organizer verified bank account details (Bank Name and Account Number) are missing from KYC verification.',
      }, { status: 400 });
    }

    try {
      const dispatchResult = await processPayoutWithProvider(
        id,
        payout.sellerId,
        amount,
        {
          bankName,
          bankUuid,
          accountNumber,
          accountName,
          bankCode: storedDetails?.bankCode || recipientDetails?.bankCode,
        }
      );

      return NextResponse.json({
        id,
        status: 'PROCESSING',
        method: 'BANK_TRANSFER',
        bankName,
        accountNumber,
        providerReference: dispatchResult.providerReference,
        netAmount: dispatchResult.feeDetails.netPayoutAmount,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Bank transfer payout failed' }, { status: 500 });
    }
  }

  await execute('UPDATE payout_requests SET status = ? WHERE id = ?', [status, id]);
  await execute(
    `INSERT INTO approval_records (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
     VALUES (?, ?, 'UPDATED_PAYOUT', 'PAYOUT', ?, ?, ?, ?)`,
    [user.uid, adminRole, id, reason || null, payout.status, status]
  );

  return NextResponse.json({ id, status });
}