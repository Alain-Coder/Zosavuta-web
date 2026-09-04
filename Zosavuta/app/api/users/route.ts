import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-server';

/** POST – create / sync a user from Firebase Auth */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { uid, email, fullName, role = 'customer', provider = 'email' } = body;

  if (!uid || !email || !fullName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const allowedRoles = ['customer', 'organizer', 'customer_organizer'];
  const safeRole = allowedRoles.includes(role) ? role : 'customer';

  await execute(
    `INSERT INTO users (uid, email, fullName, role, provider)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email), fullName = VALUES(fullName)`,
    [uid, email, fullName, safeRole, provider]
  );

  return NextResponse.json({ uid, role: safeRole }, { status: 201 });
}
