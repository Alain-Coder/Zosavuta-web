import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { query, execute } from '@/lib/db';
import {
  parseVerificationRow,
  logVerificationHistory,
  getVerificationHistory,
  OrganizerVerificationStatus,
} from '@/lib/organizer-verification';
import { logFinancialAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
      return NextResponse.json({ error: 'Admin or Accountant access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let sql = `
      SELECT v.*, u.fullName AS userName, u.email AS userEmail, u.role AS userRole
      FROM organizer_verifications v
      LEFT JOIN users u ON u.uid = v.userId
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND v.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ` AND (u.fullName LIKE ? OR u.email LIKE ? OR v.legalName LIKE ? OR v.businessName LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY v.updatedAt DESC';

    const rows = await query<any>(sql, params);
    const verifications = rows.map(parseVerificationRow);

    const counts = {
      total: verifications.length,
      pending: verifications.filter((v) => v.status === 'SUBMITTED').length,
      underReview: verifications.filter((v) => v.status === 'UNDER_REVIEW').length,
      approved: verifications.filter((v) => v.status === 'APPROVED').length,
      rejected: verifications.filter((v) => v.status === 'REJECTED').length,
      suspended: verifications.filter((v) => v.status === 'SUSPENDED').length,
    };

    return NextResponse.json({ verifications, counts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch verifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
      return NextResponse.json({ error: 'Admin or Accountant access required' }, { status: 403 });
    }

    const body = await req.json();
    const { verificationId, action, notes, rejectionReason } = body;

    if (!verificationId) {
      return NextResponse.json({ error: 'Verification ID is required' }, { status: 400 });
    }

    const currentRows = await query<any>(
      `SELECT * FROM organizer_verifications WHERE id = ? LIMIT 1`,
      [verificationId]
    );

    if (!currentRows.length) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    const current = currentRows[0];
    let nextStatus: OrganizerVerificationStatus = current.status;
    let auditAction = 'ORGANIZER_KYC_UPDATED';

    switch (action) {
      case 'approve':
        nextStatus = 'APPROVED';
        auditAction = 'ORGANIZER_KYC_APPROVED';
        break;
      case 'reject':
        if (!rejectionReason?.trim()) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }
        nextStatus = 'REJECTED';
        auditAction = 'ORGANIZER_KYC_REJECTED';
        break;
      case 'under_review':
        nextStatus = 'UNDER_REVIEW';
        auditAction = 'ORGANIZER_KYC_UNDER_REVIEW';
        break;
      case 'request_info':
        nextStatus = 'UNDER_REVIEW';
        auditAction = 'ORGANIZER_KYC_INFO_REQUESTED';
        break;
      case 'suspend':
        nextStatus = 'SUSPENDED';
        auditAction = 'ORGANIZER_KYC_SUSPENDED';
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await execute(
      `UPDATE organizer_verifications
       SET status = ?, adminNotes = ?, rejectionReason = ?, reviewedBy = ?, reviewedAt = NOW()
       WHERE id = ?`,
      [
        nextStatus,
        notes || current.adminNotes || null,
        rejectionReason || (action === 'approve' ? null : current.rejectionReason),
        user!.uid,
        verificationId,
      ]
    );

    // Record in verification history
    await logVerificationHistory(
      verificationId,
      current.userId,
      nextStatus,
      user!.uid,
      user!.role,
      notes || rejectionReason || `Verification status changed to ${nextStatus}`
    );

    // Record compliance financial audit log
    await logFinancialAudit({
      actorId: user!.uid,
      actorRole: user!.role,
      action: auditAction,
      entityType: 'ORGANIZER_VERIFICATION',
      entityId: String(verificationId),
      oldValues: { status: current.status },
      newValues: { status: nextStatus, notes, rejectionReason },
    });

    const history = await getVerificationHistory(verificationId);

    return NextResponse.json({
      success: true,
      message: `Organizer verification updated to ${nextStatus}`,
      status: nextStatus,
      history,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
