import { NextRequest, NextResponse } from 'next/server';
import { getFinancialAuditLogs } from '@/lib/audit';
import { getUserAdminRole } from '@/lib/security-controls';

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-admin-id') || req.nextUrl.searchParams.get('adminId');
    if (!adminId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const limit = Number(req.nextUrl.searchParams.get('limit') || 100);
    const offset = Number(req.nextUrl.searchParams.get('offset') || 0);

    const logs = await getFinancialAuditLogs(limit, offset);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
