import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const authenticatedUser = await getAuthUser(req, true);
  if (!authenticatedUser) return NextResponse.json({ error: 'Authentication required', code: 'INVALID_AUTH_TOKEN' }, { status: 401 });
  if (authenticatedUser.uid !== uid) return NextResponse.json({ error: 'Authentication required', code: 'USER_ID_MISMATCH' }, { status: 401 });
  if (!authenticatedUser.emailVerified) {
    return NextResponse.json({ error: 'Verify your email address before continuing.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
  }
  const rows = await query('SELECT * FROM users WHERE uid = ?', [uid]);
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
