import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!hasRole(user, ['admin'])) {
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
    'SELECT id FROM event_submissions WHERE id = ? AND status = ?',
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

  return NextResponse.json({ status: 'rejected' });
}
