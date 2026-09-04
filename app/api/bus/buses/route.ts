import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get('operatorId');
  let sql = 'SELECT * FROM buses';
  const params: any[] = [];
  if (operatorId) { sql += ' WHERE operatorId = ?'; params.push(operatorId); }
  return NextResponse.json(await query(sql, params));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = 'bus_' + Math.random().toString(36).substr(2, 9);
  const { operatorId, licensePlate, capacity, model, seatLayoutType, amenities } = body;
  await execute(
    `INSERT INTO buses (id, operatorId, licensePlate, capacity, model, seatLayoutType, amenities)
     VALUES (?,?,?,?,?,?,?)`,
    [id, operatorId, licensePlate, capacity, model || null, seatLayoutType || null, amenities ? JSON.stringify(amenities) : null]
  );
  return NextResponse.json({ id }, { status: 201 });
}
