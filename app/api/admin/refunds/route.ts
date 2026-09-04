import { NextRequest, NextResponse } from 'next/server';
import { getUserAdminRole, checkAndRegisterDualApproval } from '@/lib/security-controls';
import { processTicketRefund, processEventCancellation, processChargeback } from '@/lib/refunds';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId, eventId, paymentId, reason, adminId } = body;

    if (!action || !adminId) {
      return NextResponse.json({ error: 'action and adminId are required' }, { status: 400 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (action === 'refund_ticket') {
      if (!ticketId) return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
      const result = await processTicketRefund(Number(ticketId), reason || 'Customer refund', adminId, adminRole);
      return NextResponse.json({ success: true, result });
    } else if (action === 'cancel_event') {
      if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

      // Event cancellation is high-risk and requires dual approval
      const segregationCheck = await checkAndRegisterDualApproval(
        adminId,
        adminRole,
        'EVENT_CANCELLATION',
        'EVENT',
        String(eventId),
        100000 // High value threshold
      );

      if (!segregationCheck.allowed) {
        return NextResponse.json({
          success: false,
          dualApprovalPending: segregationCheck.dualApprovalPending,
          reason: segregationCheck.reason,
        }, { status: 403 });
      }

      const result = await processEventCancellation(Number(eventId), reason || 'Event cancelled by organizer/admin', adminId, adminRole);
      return NextResponse.json({ success: true, result });
    } else if (action === 'chargeback') {
      if (!paymentId) return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
      const result = await processChargeback(paymentId, reason || 'Bank dispute / chargeback', adminId, adminRole);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process refund workflow' }, { status: 500 });
  }
}
