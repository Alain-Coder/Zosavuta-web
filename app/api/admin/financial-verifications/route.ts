import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserAdminRole, checkAndRegisterDualApproval } from '@/lib/security-controls';
import {
  processPayoutWithProvider,
  processMobileMoneyPayoutWithProvider,
  PayoutRecipientBankDetails,
  MobileMoneyPayoutDetails,
} from '@/lib/paychangu-payouts';
import { getVerificationByUserId } from '@/lib/organizer-verification';
import { calculatePayoutFees } from '@/lib/fees';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-admin-id') || req.nextUrl.searchParams.get('adminId');
    if (!adminId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // Verify caller's JWT matches the claimed adminId
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.uid !== adminId) {
      return NextResponse.json({ error: 'Token mismatch or invalid token' }, { status: 401 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const payouts = await query<any>(
      `SELECT p.*, u.fullName as sellerName, u.email as sellerEmail, b.pendingBalance, b.availableBalance, b.paidOutBalance
       FROM payout_requests p
       JOIN users u ON p.sellerId = u.uid
       LEFT JOIN seller_balances b ON p.sellerId = b.sellerId
       ORDER BY p.createdAt DESC`
    );

    const enrichedPayouts = await Promise.all(
      payouts.map(async (p: any) => {
        let details = p.payoutDetails;
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch { details = null; }
        }

        const isMobile = details?.method === 'MOBILE_MONEY' || Boolean(details?.phoneNumber);

        const verif = await getVerificationByUserId(p.sellerId);
        const rawBank = verif
          ? (verif.businessType === 'registered'
              ? (verif.businessPayoutDetails || verif.individualPayoutDetails)
              : (verif.individualPayoutDetails || verif.businessPayoutDetails))
          : null;

        if (!details && rawBank && rawBank.accountNumber) {
          details = {
            method: 'BANK_TRANSFER',
            bankName: rawBank.bankName || '',
            accountNumber: rawBank.accountNumber || '',
            accountName: rawBank.accountName || verif?.legalName || verif?.businessName || p.sellerName || '',
          };
        }

        const fees = isMobile
          ? { payoutFee: Number(p.feeAmount || 0), netPayoutAmount: Number(p.netAmount || 0) }
          : await calculatePayoutFees(Number(p.amount));

        return {
          ...p,
          payoutDetails: details,
          method: isMobile ? 'MOBILE_MONEY' : (details?.method || 'BANK_TRANSFER'),
          feeAmount: Number(p.feeAmount) > 0 ? Number(p.feeAmount) : fees.payoutFee,
          netAmount: Number(p.netAmount) > 0 ? Number(p.netAmount) : fees.netPayoutAmount,
          verificationStatus: verif?.status || (isMobile ? 'RESALE_ATTENDEE' : 'NOT_STARTED'),
        };
      })
    );

    return NextResponse.json({ success: true, payouts: enrichedPayouts });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch financial verification queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payoutId, action, adminId, recipientDetails } = body;

    if (!payoutId || !action || !adminId) {
      return NextResponse.json({ error: 'payoutId, action, and adminId are required' }, { status: 400 });
    }

    // Verify caller's JWT matches the claimed adminId
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.uid !== adminId) {
      return NextResponse.json({ error: 'Token mismatch or invalid token' }, { status: 401 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) {
      return NextResponse.json({ error: 'Insufficient admin permissions.' }, { status: 403 });
    }

    const payoutRows = await query<any>('SELECT * FROM payout_requests WHERE id = ?', [payoutId]);
    const payout = payoutRows[0];
    if (!payout) return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    if (payout.status === 'COMPLETED' || payout.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Payout request has already been finalized' }, { status: 409 });
    }

    const amount = Number(payout.amount);

    if (action === 'approve') {
      // Enforce Segregation of Duties & Dual Approval Rule
      const segregationCheck = await checkAndRegisterDualApproval(
        adminId,
        adminRole,
        'PAYOUT_APPROVAL',
        'PAYOUT_REQUEST',
        payoutId,
        amount,
        payout.sellerId
      );

      if (!segregationCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            dualApprovalPending: segregationCheck.dualApprovalPending,
            reason: segregationCheck.reason,
          },
          { status: 403 }
        );
      }

      // Look up organizer verified bank details (STRICT: Bank Transfer Only per payouts.md)
      const verif = await getVerificationByUserId(payout.sellerId);
      const rawBank = verif
        ? (verif.businessType === 'registered'
            ? (verif.businessPayoutDetails || verif.individualPayoutDetails)
            : (verif.individualPayoutDetails || verif.businessPayoutDetails))
        : null;

      let storedDetails = payout.payoutDetails;
      if (typeof storedDetails === 'string') {
        try { storedDetails = JSON.parse(storedDetails); } catch { storedDetails = null; }
      }

      const isMobileMoney =
        storedDetails?.method === 'MOBILE_MONEY' ||
        Boolean(storedDetails?.phoneNumber) ||
        recipientDetails?.method === 'MOBILE_MONEY' ||
        Boolean(recipientDetails?.phoneNumber);

      // ── Handle Mobile Money Payout (Attendee ticket resale withdrawals via PayChangu) ──
      if (isMobileMoney) {
        const operator = storedDetails?.operator || recipientDetails?.operator || 'Airtel Money';
        const phoneNumber = storedDetails?.phoneNumber || recipientDetails?.phoneNumber;
        const accountName = storedDetails?.accountName || recipientDetails?.accountName || 'Attendee';
        const bankUuid = storedDetails?.bankUuid || recipientDetails?.bankUuid;

        if (!phoneNumber) {
          return NextResponse.json(
            { error: 'Mobile money phone number is required for attendee resale payout dispatch' },
            { status: 400 }
          );
        }

        const dispatchResult = await processMobileMoneyPayoutWithProvider(
          payoutId,
          payout.sellerId,
          amount,
          {
            operator,
            phoneNumber,
            accountName,
            bankUuid,
          }
        );

        return NextResponse.json({
          success: true,
          method: 'MOBILE_MONEY',
          operator,
          phoneNumber,
          message: `Payout verified and dispatched via ${operator} to ${phoneNumber}. Net: MWK ${dispatchResult.feeDetails.netPayoutAmount.toLocaleString()}`,
          providerReference: dispatchResult.providerReference,
          feeDetails: dispatchResult.feeDetails,
        });
      }

      // ── Handle Bank Transfer Payout (Organizer settlements via PayChangu) ──
      const bankName = storedDetails?.bankName || rawBank?.bankName || recipientDetails?.bankName;
      const bankUuid = storedDetails?.bankUuid || rawBank?.bankUuid || recipientDetails?.bankUuid;
      const accountNumber = storedDetails?.accountNumber || rawBank?.accountNumber || recipientDetails?.accountNumber;
      const accountName = storedDetails?.accountName || rawBank?.accountName || recipientDetails?.accountName || verif?.legalName || verif?.businessName || 'Organizer';

      if (!bankName || !accountNumber) {
        return NextResponse.json({
          error: 'Organizer verified bank account details (Bank Name and Account Number) are missing from KYC verification.',
        }, { status: 400 });
      }

      const recipient: PayoutRecipientBankDetails = {
        bankName,
        bankUuid,
        accountNumber,
        accountName,
        bankCode: storedDetails?.bankCode || recipientDetails?.bankCode,
      };

      const dispatchResult = await processPayoutWithProvider(payoutId, payout.sellerId, amount, recipient);

      return NextResponse.json({
        success: true,
        method: 'BANK_TRANSFER',
        message: `Payout verified and dispatched via Bank Transfer to ${bankName} (${accountNumber}). Fee: MWK ${dispatchResult.feeDetails.payoutFee.toLocaleString()}, Net: MWK ${dispatchResult.feeDetails.netPayoutAmount.toLocaleString()}`,
        providerReference: dispatchResult.providerReference,
        feeDetails: dispatchResult.feeDetails,
      });
    }

    if (action === 'reject') {
      const reason = body.reason || 'Rejected by administrator';
      await execute("UPDATE payout_requests SET status = 'CANCELLED' WHERE id = ?", [payoutId]);
      await execute('UPDATE seller_balances SET availableBalance = availableBalance + ? WHERE sellerId = ?', [amount, payout.sellerId]);
      return NextResponse.json({
        success: true,
        message: 'Payout request rejected and seller balance restored.',
        status: 'CANCELLED',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process payout verification' }, { status: 500 });
  }
}
