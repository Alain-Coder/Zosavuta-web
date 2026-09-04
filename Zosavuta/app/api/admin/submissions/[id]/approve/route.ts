import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!hasRole(user, ['admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    const submissions = await query(
      `SELECT * FROM event_submissions
       WHERE id = ? AND status = 'pending' AND ticketDetailsSubmitted = 1`,
      [submissionId]
    );

    if (!submissions.length) {
      return NextResponse.json(
        {
          error:
            'Submission not found, already reviewed, or ticket details not yet submitted by organizer',
        },
        { status: 404 }
      );
    }

    const s = submissions[0] as Record<string, unknown>;

    if (s.price == null || s.ticketsTotal == null) {
      return NextResponse.json(
        { error: 'Cannot approve — ticket price and quantity are missing' },
        { status: 400 }
      );
    }

    const eventResult = await execute(
      `INSERT INTO events (
        title, description, fullDescription, category, date, time, location, venue,
        image, price, ticketsTotal, ticketsAvailable, organizerId, status, busTransport, seatingChart
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        s.title,
        s.description,
        s.fullDescription,
        s.category,
        s.date,
        s.time,
        s.location,
        s.venue,
        s.image,
        s.price,
        s.ticketsTotal,
        s.ticketsTotal,
        s.organizerId,
        'active',
        s.busTransport,
        s.seatingChart,
      ]
    );

    await execute(
      `UPDATE event_submissions
       SET status = 'approved', reviewedBy = ?, reviewedAt = NOW(), eventId = ?
       WHERE id = ?`,
      [user.uid, eventResult.insertId, submissionId]
    );

    return NextResponse.json({ eventId: eventResult.insertId, status: 'approved' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Approval failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
