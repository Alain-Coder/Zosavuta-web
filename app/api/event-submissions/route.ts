import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, hasAdminRole, ensureUserRecord, canOrganizeEvents } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizerId = searchParams.get('organizerId');
    const status = searchParams.get('status');
    const readyForReview = searchParams.get('readyForReview') === 'true';

    let sql = `
      SELECT s.*, u.fullName AS organizerName, u.email AS organizerEmail
      FROM event_submissions s
      JOIN users u ON u.uid = s.organizerId
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
      if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
      }
    } else if (canOrganizeEvents(user)) {
      sql += ' AND s.organizerId = ?';
      params.push(user.uid);
      if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (organizerId && hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
      sql += ' AND s.organizerId = ?';
      params.push(organizerId);
    }

    if (readyForReview) {
      sql += ' AND s.ticketDetailsSubmitted = 1';
    }

    sql += ' ORDER BY s.createdAt DESC';

    const rows = await query(sql, params);
    const parsedRows = (rows as any[]).map((row) => ({
      ...row,
      ticketTypes:
        typeof row.ticketTypes === 'string'
          ? (() => {
              try {
                return JSON.parse(row.ticketTypes);
              } catch {
                return [];
              }
            })()
          : row.ticketTypes || [],
    }));
    return NextResponse.json(parsedRows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch submissions';
    const isMissingTable = message.includes("event_submissions") && message.includes("doesn't exist");
    return NextResponse.json(
      { error: isMissingTable ? 'Database not migrated. Run: npm run db:migrate' : message },
      { status: isMissingTable ? 503 : 500 }
    );
  }
}

/** Step 1: Organizer creates event shell — always status = pending, no live tickets yet */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Forbidden — organizer role required' }, { status: 403 });
    }

    await ensureUserRecord(user);

    const body = await req.json();
    const {
      title,
      description,
      fullDescription,
      category,
      date,
      time,
      location,
      venue,
      image,
      busTransport,
      seatingChart,
      ticketTypes,
      price,
      ticketsTotal,
    } = body;

    if (!title || !date || !time || !location || !venue) {
      return NextResponse.json({ error: 'Event title, date, time, location and venue are required' }, { status: 400 });
    }

    // Save only the organizer-provided ticket types — no auto-calculation for missing tiers
    let formattedTicketTypes: Array<{ name: string; price: number }> = [];
    if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      formattedTicketTypes = ticketTypes
        .filter((t: any) => t && t.name)
        .map((t: any) => ({
          name: String(t.name).trim(),
          price: Math.max(0, Number(t.price) || 0),
        }));
    }

    // The base `price` column = the Standard ticket price (or the provided price fallback)
    const standardPrice =
      formattedTicketTypes.find((t) => t.name.toLowerCase() === 'standard')?.price ??
      (price != null && !isNaN(Number(price)) && Number(price) > 0 ? Number(price) : 3500);
    const parsedTicketsTotal =
      ticketsTotal != null && !isNaN(parseInt(String(ticketsTotal), 10)) && parseInt(String(ticketsTotal), 10) > 0
        ? parseInt(String(ticketsTotal), 10)
        : null;

    const ticketDetailsSubmitted = parsedTicketsTotal !== null ? 1 : 0;

    const result = await execute(
      `INSERT INTO event_submissions (
        title, description, fullDescription, category, date, time, location, venue,
        image, price, ticketsTotal, organizerId, busTransport, seatingChart,
        status, ticketDetailsSubmitted, ticketTypes
      ) VALUES (?,?,?,?,?,?,?,?,?, ?, ?, ?,?,?, 'pending', ?, ?)`,
      [
        title,
        description || null,
        fullDescription || null,
        category || 'music',
        date,
        time,
        location,
        venue,
        image || null,
        standardPrice,
        parsedTicketsTotal,
        user.uid,
        busTransport ? 1 : 0,
        seatingChart ? 1 : 0,
        ticketDetailsSubmitted,
        JSON.stringify(formattedTicketTypes),
      ]
    );

    return NextResponse.json(
      {
        id: result.insertId,
        status: 'pending',
        ticketDetailsSubmitted: Boolean(ticketDetailsSubmitted),
        ticketTypes: formattedTicketTypes,
        message: ticketDetailsSubmitted
          ? 'Event and ticket details submitted. Awaiting admin approval.'
          : 'Event created with pending status. Add ticket details next.',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create submission';
    const isMissingTable = message.includes("event_submissions") && message.includes("doesn't exist");
    const isFkError = message.includes('foreign key constraint');
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'Database not migrated. Run: npm run db:migrate'
          : isFkError
            ? 'User profile not found. Sign out and sign in again.'
            : message,
      },
      { status: isMissingTable ? 503 : isFkError ? 400 : 500 }
    );
  }
}
