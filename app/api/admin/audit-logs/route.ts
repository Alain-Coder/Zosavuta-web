import { NextRequest, NextResponse } from 'next/server';
import { getFinancialAuditLogs } from '@/lib/audit';
import { getUserAdminRole } from '@/lib/security-controls';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-admin-id') || req.nextUrl.searchParams.get('adminId');
    if (!adminId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // Verify caller's JWT matches the claimed adminId
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.uid !== adminId) {
      return NextResponse.json({ error: 'Token mismatch or invalid token' }, { status: 401 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1));
    const limit = Math.max(1, Math.min(100, Number(req.nextUrl.searchParams.get('limit') || 20)));
    const offset = req.nextUrl.searchParams.has('offset')
      ? Number(req.nextUrl.searchParams.get('offset'))
      : (page - 1) * limit;
    const search = req.nextUrl.searchParams.get('search') || undefined;

    const { logs, total } = await getFinancialAuditLogs(limit, offset, search);
    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
