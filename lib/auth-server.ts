import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { canOrganize, type UserRole } from '@/lib/roles';

export type { UserRole };

export interface AuthUser {
  uid: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  emailVerified: boolean;
  authTime?: number;
  adminRole?: 'SYSTEM_ADMINISTRATOR' | 'ACCOUNTANT';
}

export async function verifyIdToken(
  idToken: string
): Promise<{ uid: string; email?: string; displayName?: string; emailVerified: boolean; authTime?: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const user = data.users?.[0];
  if (!user) return null;
  let authTime: number | undefined;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
    if (Number.isInteger(payload.auth_time)) authTime = payload.auth_time;
  } catch {
    return null;
  }

  return {
    uid: user.localId,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified === true,
    authTime,
  };
}

export async function ensureUserRecord(user: AuthUser): Promise<void> {
  const rows = await query('SELECT uid FROM users WHERE uid = ?', [user.uid]);
  if (rows.length) return;

  await execute(
    `INSERT INTO users (uid, email, fullName, role, provider, emailVerified)
     VALUES (?, ?, ?, ?, 'email', ?)`,
    [
      user.uid,
      user.email || `${user.uid}@unknown.local`,
      user.fullName || 'User',
      user.role,
      user.emailVerified ? 1 : 0,
    ]
  );
}

import type { NextApiRequest } from 'next';

export async function getAuthUser(
  req: NextRequest | NextApiRequest,
  allowUnverified = false
): Promise<AuthUser | null> {
  // Support both NextRequest (Headers API) and NextApiRequest (plain object)
  let authHeader: string | undefined;
  if ('get' in (req as any).headers) {
    // NextRequest style
    authHeader = (req as any).headers.get('Authorization') ?? undefined;
  } else {
    // NextApiRequest style – headers are lower‑cased keys in an object
    const hdrs = (req as any).headers as Record<string, string | string[]>;
    const raw = hdrs['authorization'] ?? hdrs['Authorization'];
    authHeader = Array.isArray(raw) ? raw[0] : raw;
  }
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const decoded = await verifyIdToken(token);
  if (!decoded) return null;

  const rows = await query<{
    role: UserRole;
    adminRole?: AuthUser['adminRole'];
    fullName: string;
    email: string;
    emailVerified: number | boolean;
  }>(
    'SELECT role, adminRole, fullName, email, emailVerified FROM users WHERE uid = ?',
    [decoded.uid]
  );

  if (!rows.length) {
    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.displayName,
      role: 'customer',
      emailVerified: decoded.emailVerified,
      authTime: decoded.authTime,
    };
    return allowUnverified || user.emailVerified ? user : null;
  }

  const emailMatches = rows[0].email.toLowerCase() === (decoded.email || '').toLowerCase();
  if (decoded.emailVerified && decoded.email && !emailMatches) {
    await execute('UPDATE users SET email = ?, emailVerified = 1 WHERE uid = ?', [decoded.email, decoded.uid]);
  }
  const emailVerified = decoded.emailVerified || (emailMatches && Boolean(Number(rows[0].emailVerified)));
  if (!allowUnverified && !emailVerified) return null;

  return {
    uid: decoded.uid,
    email: decoded.emailVerified ? decoded.email : rows[0].email || decoded.email,
    fullName: rows[0].fullName,
    role: rows[0].role,
    adminRole: rows[0].adminRole,
    emailVerified,
    authTime: decoded.authTime,
  };
}

export function hasRole(
  user: AuthUser | null,
  roles: UserRole[]
): user is AuthUser {
  return !!user && roles.includes(user.role);
}

export function hasAdminRole(
  user: AuthUser | null,
  roles: Array<'SYSTEM_ADMINISTRATOR' | 'ACCOUNTANT'>
): boolean {
  if (!user) return false;
  if (user.adminRole) return roles.includes(user.adminRole);
  return user.role === 'admin' && roles.includes('SYSTEM_ADMINISTRATOR');
}

export async function requireAuthUser(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export function hasRecentAuthentication(user: AuthUser, maxAgeSeconds = 10 * 60): boolean {
  if (!user.authTime) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - user.authTime;
  return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
}

export function canOrganizeEvents(user: AuthUser | null): user is AuthUser {
  return !!user && canOrganize(user.role);
}
