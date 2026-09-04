import { query, execute } from '@/lib/db';

export type AdminRole = 'SYSTEM_ADMINISTRATOR' | 'ACCOUNTANT';

export interface SegregationCheckResult {
  allowed: boolean;
  dualApprovalPending: boolean;
  reason?: string;
  approvalRecordId?: number;
}

export async function getUserAdminRole(uid: string): Promise<AdminRole | null> {
  const rows = await query<{ adminRole: AdminRole; role: string }>(
    'SELECT adminRole, role FROM users WHERE uid = ? LIMIT 1',
    [uid]
  );
  if (!rows || rows.length === 0) return null;
  const user = rows[0];
  if (user.adminRole) return user.adminRole;
  if (user.role === 'admin') return 'SYSTEM_ADMINISTRATOR';
  return null;
}

export const DUAL_APPROVAL_THRESHOLD_MWK = 50000; // MWK 50,000

export async function checkAndRegisterDualApproval(
  actorId: string,
  actorRole: AdminRole,
  action: string,
  targetType: string,
  targetId: string,
  amount: number,
  sellerId?: string
): Promise<SegregationCheckResult> {
  // Rule 1: Segregation of Duties - Actor cannot approve own financial payouts or earnings
  if (sellerId && actorId === sellerId) {
    return {
      allowed: false,
      dualApprovalPending: false,
      reason: 'Segregation of Duties Violation: You cannot approve payouts or financial requests for your own account.',
    };
  }

  // Rule 2: High-risk financial thresholds require dual approval from two distinct admin users
  if (amount >= DUAL_APPROVAL_THRESHOLD_MWK) {
    const existingApprovals = await query<any>(
      `SELECT id, adminId, adminRole, newStatus 
       FROM approval_records 
       WHERE targetType = ? AND targetId = ? AND action = ?`,
      [targetType, targetId, action]
    );

    if (existingApprovals.length === 0) {
      // Record first approval
      const insertResult = await execute(
        `INSERT INTO approval_records (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
         VALUES (?, ?, ?, ?, ?, 'First level sign-off recorded', 'PENDING', 'FIRST_SIGN_OFF_COMPLETE')`,
        [actorId, actorRole, action, targetType, targetId]
      );

      return {
        allowed: false,
        dualApprovalPending: true,
        approvalRecordId: insertResult.insertId,
        reason: `High-value request (MWK ${amount.toLocaleString()}) requires secondary sign-off from a different administrator or accountant. First level sign-off recorded.`,
      };
    }

    const firstSignOff = existingApprovals[0];
    if (firstSignOff.adminId === actorId) {
      return {
        allowed: false,
        dualApprovalPending: true,
        reason: 'Dual Approval Rule: Secondary sign-off must be performed by a different administrator or accountant.',
      };
    }

    // Record second approval
    await execute(
      `INSERT INTO approval_records (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
       VALUES (?, ?, ?, ?, ?, 'Second level sign-off complete', 'FIRST_SIGN_OFF_COMPLETE', 'APPROVED')`,
      [actorId, actorRole, action, targetType, targetId]
    );

    return {
      allowed: true,
      dualApprovalPending: false,
    };
  }

  // Single sign-off permitted for under-threshold requests
  await execute(
    `INSERT INTO approval_records (adminId, adminRole, action, targetType, targetId, reason, previousStatus, newStatus)
     VALUES (?, ?, ?, ?, ?, 'Standard sign-off approved', 'PENDING', 'APPROVED')`,
    [actorId, actorRole, action, targetType, targetId]
  );

  return {
    allowed: true,
    dualApprovalPending: false,
  };
}
