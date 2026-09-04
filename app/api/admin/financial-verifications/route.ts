import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserAdminRole, checkAndRegisterDualApproval } from '@/lib/security-controls';
import { processPayoutWithProvider, PayoutRecipientDetails } from '@/lib/paychangu-payouts';

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-admin-id') || req.nextUrl.searchParams.get('adminId');
    if (!adminId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const payouts = await query<any>(
      `SELECT p.*, u.fullName as sellerName, u.email as sellerEmail, b.pendingBalance, b.availableBalance, b.paidOutBalance
       FROM payout_requests p
       JOIN users u ON p.sellerId = u.uid
       LEFT JOIN seller_balances b ON p.sellerId = b.sellerId
       ORDER BY p.createdAt DESC`
    );

    return NextResponse.json({ success: true, payouts });
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

      // Both sign-offs approved! Dispatch settlement payout to PayChangu
      const recipient: PayoutRecipientDetails = recipientDetails || {
        mobileNumber: body.mobileNumber,
        mobileOperator: body.mobileOperator || 'AIRTEL',
        recipientName: payout.sellerId,
      };

      const dispatchResult = await processPayoutWithProvider(payoutId, payout.sellerId, amount, recipient);

      return NextResponse.json({
        success: true,
        message: 'Payout request verified, dual-approved, and dispatched to PayChangu settlement provider',
        providerReference: dispatchResult.providerReference,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process payout verification' }, { status: 500 });
  }
}
