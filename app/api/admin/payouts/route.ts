import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { checkAndRegisterDualApproval, AdminRole } from '@/lib/security-controls';
import { processPayoutWithProvider } from '@/lib/paychangu-payouts';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await query('SELECT * FROM payout_requests ORDER BY createdAt DESC'));
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, status, reason, recipientDetails } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });

  const payouts = await query<{ sellerId: string; amount: number; status: string }>('SELECT sellerId, amount, status FROM payout_requests WHERE id = ?', [id]);
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

    // Process payout via PayChangu settlement provider
    const dispatchResult = await processPayoutWithProvider(
      id,
      payout.sellerId,
      amount,
      recipientDetails || { recipientName: payout.sellerId }
    );

    return NextResponse.json({ id, status: 'PROCESSING', providerReference: dispatchResult.providerReference });
  }

  await execute('UPDATE payout_requests SET status = ? WHERE id = ?', [status, id]);
  await execute(
    `INSERT INTO approval_records (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
     VALUES (?, ?, 'UPDATED_PAYOUT', 'PAYOUT', ?, ?, ?, ?)`,
    [user.uid, adminRole, id, reason || null, payout.status, status]
  );

  return NextResponse.json({ id, status });
}