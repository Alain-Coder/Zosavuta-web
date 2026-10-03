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

    const submission = rows[0] as Record<string, any>;
    if (user.role !== 'admin' && submission.organizerId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only return organizer-configured ticket types — no auto-calculation for missing tiers
    let parsedTicketTypes: Array<{ name: string; price: number }> = [];
    if (typeof submission.ticketTypes === 'string') {
      try {
        parsedTicketTypes = JSON.parse(submission.ticketTypes);
      } catch {
        parsedTicketTypes = [];
      }
    } else if (Array.isArray(submission.ticketTypes)) {
      parsedTicketTypes = submission.ticketTypes;
    }

    return NextResponse.json({
      ...submission,
      ticketTypes: parsedTicketTypes,
    });
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

    // Process and guarantee Standard, VIP, and VVIP ticket types
    let formattedTicketTypes: Array<{ name: string; price: number }> = [];
    if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      formattedTicketTypes = ticketTypes
        .filter((t: any) => t && t.name)
        .map((t: any) => ({
          name: String(t.name).trim(),
          price: Math.max(0, Number(t.price) || 0),
        }));
    }

    const finalStandardPrice = formattedTicketTypes.find((t) => t.name.toLowerCase() === 'standard')?.price ?? parsedPrice;

    await execute(
      `UPDATE event_submissions
       SET price = ?, ticketsTotal = ?, ticketDetailsSubmitted = 1,
           category = COALESCE(?, category), time = COALESCE(?, time), ticketTypes = ?
       WHERE id = ? AND status = 'pending'`,
      [finalStandardPrice, parsedTickets, category || null, time || null, JSON.stringify(formattedTicketTypes), submissionId]
    );

    return NextResponse.json({
      id: submissionId,
      status: 'pending',
      ticketDetailsSubmitted: true,
      ticketTypes: formattedTicketTypes,
      message: 'Ticket details saved. Awaiting admin approval before going live.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update ticket details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
