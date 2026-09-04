import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  let sql = 'SELECT * FROM bus_operators';
  const params: any[] = [];
  if (userId) { sql += ' WHERE userId = ?'; params.push(userId); }
  return NextResponse.json(await query(sql, params));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = 'op_' + Math.random().toString(36).substr(2, 9);
  const { userId, name, email, phone } = body;
  await execute(
    'INSERT INTO bus_operators (id, userId, name, email, phone) VALUES (?,?,?,?,?)',
    [id, userId || null, name, email, phone || null]
  );
  return NextResponse.json({ id }, { status: 201 });
}
