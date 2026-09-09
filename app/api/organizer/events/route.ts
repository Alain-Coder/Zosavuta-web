import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!canOrganizeEvents(user)) return NextResponse.json({ error: 'Organizer access is required' }, { status: 403 });

  const events = await query<any>(
    `SELECT e.*, u.fullName AS organizerName
     FROM events e LEFT JOIN users u ON u.uid = e.organizerId
     WHERE e.organizerId = ?
     ORDER BY e.date DESC, e.time DESC`,
    [user.uid]
  );
  return NextResponse.json({ events });
}