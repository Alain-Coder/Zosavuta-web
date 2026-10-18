import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { eventId?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { eventId, action } = body;
  if (typeof eventId !== 'string' || !eventId.trim() || (action !== 'suspend' && action !== 'unsuspend')) {
    return NextResponse.json(
      { error: 'eventId and a valid action (suspend or unsuspend) are required' },
      { status: 400 }
    );
  }

  const currentStatus = action === 'suspend' ? 'active' : 'suspended';
  const nextStatus = action === 'suspend' ? 'suspended' : 'active';
  const result = await execute(
    'UPDATE events SET status = ? WHERE id = ? AND status = ?',
    [nextStatus, eventId.trim(), currentStatus]
  );

  if (result.affectedRows === 0) {
    const [event] = await query<{ status: string }>(
      'SELECT status FROM events WHERE id = ? LIMIT 1',
      [eventId.trim()]
    );
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: `Only ${currentStatus} events can be ${action === 'suspend' ? 'suspended' : 'unsuspended'}` },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, eventId: eventId.trim(), status: nextStatus });
}
