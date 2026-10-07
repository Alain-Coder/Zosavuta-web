import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { query, execute } from '@/lib/db';
import { formatRowToEvent } from '@/lib/db';

/**
 * GET /api/admin/featured-events
 * Returns all published active events with their featured status,
 * so the admin can manage which ones are featured.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await query<any>(
    `SELECT e.*, u.fullName as organizerName
     FROM events e
     LEFT JOIN users u ON e.organizerId = u.uid
     WHERE e.status = 'active'
     ORDER BY e.isFeatured DESC, e.date ASC`
  );

  const events = rows.map(formatRowToEvent);
  return NextResponse.json({ events });
}

/**
 * PATCH /api/admin/featured-events
 * Toggle or set the isFeatured flag for a specific event.
 * Body: { eventId: string, isFeatured: boolean }
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { eventId, isFeatured } = body;

  if (!eventId || typeof isFeatured !== 'boolean') {
    return NextResponse.json({ error: 'eventId and isFeatured (boolean) are required' }, { status: 400 });
  }

  await execute(
    `UPDATE events SET isFeatured = ? WHERE id = ?`,
    [isFeatured ? 1 : 0, eventId]
  );

  return NextResponse.json({ success: true, eventId, isFeatured });
}
