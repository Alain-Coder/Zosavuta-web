import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

/** POST – create / sync a user from Firebase Auth */
export async function POST(req: NextRequest) {
  const authenticatedUser = await getAuthUser(req, true);
  const body = await req.json();
  const { uid, email, fullName, role = 'customer', provider = 'email' } = body;

  if (!authenticatedUser || authenticatedUser.uid !== uid || !uid || !fullName) {
    return NextResponse.json({ error: 'Authenticated user required' }, { status: 401 });
  }

  if (!uid || !authenticatedUser.email || !fullName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const allowedRoles = ['customer', 'organizer', 'customer_organizer'];
  const safeRole = allowedRoles.includes(role) ? role : 'customer';
  const safeProvider = provider === 'google.com' ? 'google' : 'email';

  await execute(
    `INSERT INTO users (uid, email, fullName, role, provider, emailVerified)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       emailVerified = IF(email <> VALUES(email), VALUES(emailVerified), GREATEST(emailVerified, VALUES(emailVerified))),
       email = VALUES(email), fullName = VALUES(fullName)`,
    [uid, authenticatedUser.email, fullName, safeRole, safeProvider, authenticatedUser.emailVerified ? 1 : 0]
  );

  return NextResponse.json({ uid, role: safeRole, emailVerified: authenticatedUser.emailVerified }, { status: 201 });
}
