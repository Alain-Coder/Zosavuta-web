import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const organizerId = searchParams.get('organizerId');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const status = searchParams.get('status');

  let sql = 'SELECT * FROM events WHERE 1=1';
  const params: any[] = [];

  if (organizerId) { sql += ' AND organizerId = ?'; params.push(organizerId); }
  if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category); }
  if (status === 'all') {
    // no status filter
  } else if (status) {
    sql += ' AND status = ?';
    params.push(status);
  } else {
    sql += " AND status = 'active'";
  }
  if (search) { sql += ' AND (title LIKE ? OR location LIKE ? OR venue LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }

  sql += ' ORDER BY date ASC';

  const rows = await query(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasRole(user, ['admin'])) {
    return NextResponse.json(
      { error: 'Events must be created via admin approval of organizer submissions' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { title, description, fullDescription, category, date, time, location, venue,
    image, price, ticketsTotal, organizerId, status = 'draft', busTransport, seatingChart } = body;

  const result = await execute(
    `INSERT INTO events (title, description, fullDescription, category, date, time, location, venue,
      image, price, ticketsTotal, ticketsAvailable, organizerId, status, busTransport, seatingChart)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [title, description, fullDescription, category, date, time, location, venue,
      image || null, price, ticketsTotal, ticketsTotal, organizerId, status,
      busTransport ? 1 : 0, seatingChart ? 1 : 0]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
