import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { getVerificationHistory } from '@/lib/organizer-verification';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const verificationId = parseInt(id, 10);
    if (isNaN(verificationId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const history = await getVerificationHistory(verificationId);
    return NextResponse.json({ history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
