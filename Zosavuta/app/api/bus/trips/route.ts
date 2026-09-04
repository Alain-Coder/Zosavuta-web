import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get('routeId');
  const operatorId = searchParams.get('operatorId');

  let sql = 'SELECT t.* FROM trips t JOIN routes r ON t.routeId = r.id WHERE 1=1';
  const params: any[] = [];
  if (routeId) { sql += ' AND t.routeId = ?'; params.push(routeId); }
  if (operatorId) { sql += ' AND r.operatorId = ?'; params.push(operatorId); }
  sql += ' ORDER BY t.departureTime ASC';

  return NextResponse.json(await query(sql, params));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = 'trip_' + Math.random().toString(36).substr(2, 9);
  const { routeId, busId, departureTime, arrivalTime, price, seatsAvailable } = body;
  await execute(
    `INSERT INTO trips (id, routeId, busId, departureTime, arrivalTime, price, seatsAvailable, availableSeats)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, routeId, busId, departureTime, arrivalTime, price, seatsAvailable, seatsAvailable]
  );
  return NextResponse.json({ id }, { status: 201 });
}
