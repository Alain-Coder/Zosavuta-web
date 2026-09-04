import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserAdminRole } from '@/lib/security-controls';

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-admin-id') || req.nextUrl.searchParams.get('adminId');
    if (!adminId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) {
      return NextResponse.json({ error: 'Insufficient permissions. System Admin or Accountant required.' }, { status: 403 });
    }

    const submissions = await query<any>(
      `SELECT s.*, u.fullName as organizerName, u.email as organizerEmail
       FROM event_submissions s
       LEFT JOIN users u ON s.organizerId = u.uid
       ORDER BY s.createdAt DESC`
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch ticket approval queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId, action, rejectionReason, adminId } = body;

    if (!submissionId || !action || !adminId) {
      return NextResponse.json({ error: 'submissionId, action, and adminId are required' }, { status: 400 });
    }

    const adminRole = await getUserAdminRole(adminId);
    if (!adminRole) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
    }

    if (action === 'approve') {
      const submissions = await query<any>('SELECT * FROM event_submissions WHERE id = ?', [submissionId]);
      const sub = submissions[0];
      if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

      let eventId = sub.eventId;
      if (!eventId) {
        const result = await execute(
          `INSERT INTO events (title, description, fullDescription, category, date, time, location, venue, image, price, ticketsTotal, ticketsAvailable, organizerId, status, busTransport, seatingChart)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            sub.title,
            sub.description,
            sub.fullDescription,
            sub.category,
            sub.date,
            sub.time,
            sub.location,
            sub.venue,
            sub.image,
            sub.price || 0,
            sub.ticketsTotal || 0,
            sub.ticketsTotal || 0,
            sub.organizerId,
            sub.busTransport || 0,
            sub.seatingChart || 0,
          ]
        );
        eventId = result.insertId;
      } else {
        await execute(
          `UPDATE events SET status = 'active', price = ?, ticketsTotal = ?, ticketsAvailable = ? WHERE id = ?`,
          [sub.price || 0, sub.ticketsTotal || 0, sub.ticketsTotal || 0, eventId]
        );
      }

      await execute(
        `UPDATE event_submissions SET status = 'approved', reviewedBy = ?, reviewedAt = NOW(), eventId = ? WHERE id = ?`,
        [adminId, eventId, submissionId]
      );

      return NextResponse.json({ success: true, message: 'Ticket configuration approved and event activated', eventId });
    } else if (action === 'reject') {
      await execute(
        `UPDATE event_submissions SET status = 'rejected', rejectionReason = ?, reviewedBy = ?, reviewedAt = NOW() WHERE id = ?`,
        [rejectionReason || 'Ticket configuration rejected', adminId, submissionId]
      );

      return NextResponse.json({ success: true, message: 'Ticket configuration rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process ticket approval' }, { status: 500 });
  }
}
