import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserAdminRole, checkAndRegisterDualApproval } from '@/lib/security-controls';
import { processPayoutWithProvider, PayoutRecipientBankDetails } from '@/lib/paychangu-payouts';
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

        const fees = await calculatePayoutFees(Number(p.amount));

        return {
          ...p,
          payoutDetails: details,
          method: 'BANK_TRANSFER',
          feeAmount: Number(p.feeAmount) > 0 ? Number(p.feeAmount) : fees.payoutFee,
          netAmount: Number(p.netAmount) > 0 ? Number(p.netAmount) : fees.netPayoutAmount,
          verificationStatus: verif?.status || 'NOT_STARTED',
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
    const { payoutId, action, adminId } = body;

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

      const bankName = storedDetails?.bankName || rawBank?.bankName;
      const accountNumber = storedDetails?.accountNumber || rawBank?.accountNumber;
      const accountName = storedDetails?.accountName || rawBank?.accountName || verif?.legalName || verif?.businessName || 'Organizer';

      if (!bankName || !accountNumber) {
        return NextResponse.json({
          error: 'Organizer verified bank account details (Bank Name and Account Number) are missing from KYC verification.',
        }, { status: 400 });
      }

      const recipient: PayoutRecipientBankDetails = {
        bankName,
        accountNumber,
        accountName,
      };

      const dispatchResult = await processPayoutWithProvider(payoutId, payout.sellerId, amount, recipient);

      return NextResponse.json({
        success: true,
        message: `Payout verified and dispatched via Bank Transfer to ${bankName} (${accountNumber}). Fee: MWK ${dispatchResult.feeDetails.payoutFee.toLocaleString()}, Net: MWK ${dispatchResult.feeDetails.netPayoutAmount.toLocaleString()}`,
        providerReference: dispatchResult.providerReference,
        feeDetails: dispatchResult.feeDetails,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process payout verification' }, { status: 500 });
  }
}
