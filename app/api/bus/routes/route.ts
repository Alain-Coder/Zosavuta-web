import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get('operatorId');
  let sql = 'SELECT * FROM routes';
  const params: any[] = [];
  if (operatorId) { sql += ' WHERE operatorId = ?'; params.push(operatorId); }
  return NextResponse.json(await query(sql, params));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = 'route_' + Math.random().toString(36).substr(2, 9);
  const { operatorId, name, origin, destination, basePrice = 0, distanceKm, estimatedDuration } = body;
  await execute(
    `INSERT INTO routes (id, operatorId, name, origin, destination, basePrice, distanceKm, estimatedDuration)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, operatorId, name, origin, destination, basePrice, distanceKm || null, estimatedDuration || null]
  );
  return NextResponse.json({ id }, { status: 201 });
}
