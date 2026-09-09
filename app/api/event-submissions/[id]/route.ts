import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';

/** Step 2: Organizer adds ticket details to a pending submission */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    const rows = await query(
      `SELECT s.*, u.fullName AS organizerName, u.email AS organizerEmail
       FROM event_submissions s
       JOIN users u ON u.uid = s.organizerId
       WHERE s.id = ?`,
      [submissionId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = rows[0] as { organizerId: string };
    if (user.role !== 'admin' && submission.organizerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    const rows = await query<{ organizerId: string; status: string }>(
      'SELECT organizerId, status FROM event_submissions WHERE id = ?',
      [submissionId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = rows[0];
    if (user.role !== 'admin' && submission.organizerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending submissions can be updated' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { price, ticketsTotal, category, time, ticketTypes } = body;

    if (price == null || ticketsTotal == null) {
      return NextResponse.json(
        { error: 'Ticket price and number of tickets are required' },
        { status: 400 }
      );
    }

    const parsedPrice = Number(price);
    const parsedTickets = parseInt(String(ticketsTotal), 10);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }
    if (isNaN(parsedTickets) || parsedTickets <= 0) {
      return NextResponse.json({ error: 'Number of tickets must be a positive integer' }, { status: 400 });
    }

    await execute(
      `UPDATE event_submissions
       SET price = ?, ticketsTotal = ?, ticketDetailsSubmitted = 1,
           category = COALESCE(?, category), time = COALESCE(?, time), ticketTypes = ?
       WHERE id = ? AND status = 'pending'`,
      [parsedPrice, parsedTickets, category || null, time || null, JSON.stringify(Array.isArray(ticketTypes) ? ticketTypes : []), submissionId]
    );

    return NextResponse.json({
      id: submissionId,
      status: 'pending',
      ticketDetailsSubmitted: true,
      message: 'Ticket details saved. Awaiting admin approval before going live.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update ticket details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
