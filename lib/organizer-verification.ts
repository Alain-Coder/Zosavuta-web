import pool, { query, execute } from '@/lib/db';
import { logFinancialAudit } from '@/lib/audit';

export * from '@/lib/organizer-verification-types';
import type { OrganizerVerification, OrganizerVerificationStatus, VerificationHistoryItem } from '@/lib/organizer-verification-types';


export function parseVerificationRow(row: any): OrganizerVerification {
  return {
    ...row,
    applicantOwnershipPercentage: row.applicantOwnershipPercentage !== null && row.applicantOwnershipPercentage !== undefined
      ? Number(row.applicantOwnershipPercentage)
      : null,
    individualPayoutDetails: row.individualPayoutDetails
      ? (typeof row.individualPayoutDetails === 'string'
        ? JSON.parse(row.individualPayoutDetails)
        : row.individualPayoutDetails)
      : null,
    shareholders: row.shareholders
      ? (typeof row.shareholders === 'string'
        ? JSON.parse(row.shareholders)
        : row.shareholders)
      : [],
    businessPayoutDetails: row.businessPayoutDetails
      ? (typeof row.businessPayoutDetails === 'string'
        ? JSON.parse(row.businessPayoutDetails)
        : row.businessPayoutDetails)
      : null,
  };
}

export async function getVerificationByUserId(userId: string): Promise<OrganizerVerification | null> {
  const rows = await query<any>(
    `SELECT v.*, u.fullName AS userName, u.email AS userEmail
     FROM organizer_verifications v
     LEFT JOIN users u ON u.uid = v.userId
     WHERE v.userId = ?
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;
  return parseVerificationRow(rows[0]);
}

export async function checkOrganizerIsApproved(userId: string): Promise<boolean> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM organizer_verifications WHERE userId = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return false;
  return rows[0].status === 'APPROVED';
}

export async function getOrganizerVerificationStatus(userId: string): Promise<OrganizerVerificationStatus> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM organizer_verifications WHERE userId = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) return 'NOT_STARTED';
  return rows[0].status as OrganizerVerificationStatus;
}

export async function logVerificationHistory(
  verificationId: number,
  userId: string,
  action: string,
  actorId: string,
  actorRole: string,
  notes?: string
) {
  try {
    await execute(
      `INSERT INTO organizer_verification_history (verificationId, userId, action, actorId, actorRole, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [verificationId, userId, action, actorId, actorRole, notes || null]
    );
  } catch (err) {
    console.error('Failed to log verification history:', err);
  }
}

export async function getVerificationHistory(verificationId: number): Promise<VerificationHistoryItem[]> {
  const rows = await query<any>(
    `SELECT * FROM organizer_verification_history
     WHERE verificationId = ?
     ORDER BY createdAt DESC`,
    [verificationId]
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    verificationId: Number(r.verificationId),
    userId: String(r.userId),
    action: String(r.action),
    actorId: String(r.actorId),
    actorRole: String(r.actorRole),
    notes: r.notes ? String(r.notes) : null,
    createdAt: String(r.createdAt),
  }));
}
