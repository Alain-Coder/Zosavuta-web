import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { canOrganize, type UserRole } from '@/lib/roles';

export type { UserRole };

export interface AuthUser {
  uid: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  adminRole?: 'SYSTEM_ADMINISTRATOR' | 'ACCOUNTANT';
}

export async function verifyIdToken(
  idToken: string
): Promise<{ uid: string; email?: string; displayName?: string } | null> {
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

  return {
    uid: user.localId,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function ensureUserRecord(user: AuthUser): Promise<void> {
  const rows = await query('SELECT uid FROM users WHERE uid = ?', [user.uid]);
  if (rows.length) return;

  await execute(
    `INSERT INTO users (uid, email, fullName, role, provider)
     VALUES (?, ?, ?, ?, 'email')`,
    [
      user.uid,
      user.email || `${user.uid}@unknown.local`,
      user.fullName || 'User',
      user.role,
    ]
  );
}

import type { NextApiRequest } from 'next';

export async function getAuthUser(req: NextRequest | NextApiRequest): Promise<AuthUser | null> {
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

  const rows = await query<{ role: UserRole; adminRole?: AuthUser['adminRole']; fullName: string; email: string }>(
    'SELECT role, adminRole, fullName, email FROM users WHERE uid = ?',
    [decoded.uid]
  );

  if (!rows.length) {
    return {
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.displayName,
      role: 'customer',
    };
  }

  return {
    uid: decoded.uid,
    email: rows[0].email || decoded.email,
    fullName: rows[0].fullName,
    role: rows[0].role,
    adminRole: rows[0].adminRole,
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

export function canOrganizeEvents(user: AuthUser | null): user is AuthUser {
  return !!user && canOrganize(user.role);
}
