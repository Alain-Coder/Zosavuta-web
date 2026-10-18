import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { notifyOrganizerOfDecision } from '@/lib/organizer-notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const rejectionReason = body.rejectionReason || 'No reason provided';

  const submissions = await query(
    `SELECT s.id, s.title, s.organizerId, u.email AS organizerEmail, u.fullName AS organizerName
     FROM event_submissions s
     LEFT JOIN users u ON u.uid = s.organizerId
     WHERE s.id = ? AND s.status = ?`,
    [submissionId, 'pending']
  );

  if (!submissions.length) {
    return NextResponse.json({ error: 'Submission not found or already reviewed' }, { status: 404 });
  }

  await execute(
    `UPDATE event_submissions
     SET status = 'rejected', rejectionReason = ?, reviewedBy = ?, reviewedAt = NOW()
     WHERE id = ?`,
    [rejectionReason, user.uid, submissionId]
  );

  await execute(
    `INSERT INTO approval_records
     (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
    VALUES (?, ?, 'REJECTED_EVENT', 'EVENT_SUBMISSION', ?, ?, 'pending', 'rejected')`,
      [user.uid, user.adminRole || 'SYSTEM_ADMINISTRATOR', String(submissionId), rejectionReason]
  );

    const submission = submissions[0] as {
      title: string;
      organizerEmail: string | null;
      organizerName: string | null;
    };
    await notifyOrganizerOfDecision({
      to: submission.organizerEmail || '',
      recipientName: submission.organizerName,
      approvedItem: 'event submission',
      decision: 'rejected',
      title: submission.title || 'Your event',
      reason: rejectionReason,
    });

  return NextResponse.json({ status: 'rejected' });
}
