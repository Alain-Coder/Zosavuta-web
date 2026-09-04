import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Operator } from '@/types/operator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await (pool as any).query(
      'SELECT id, email, name, phone, suspended FROM bus_operators LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const operators = rows as Operator[];
    const [countRows] = await (pool as any).query('SELECT COUNT(*) as total FROM bus_operators');
    const total = (countRows as any)[0].total;
    return NextResponse.json({ data: operators, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch operators' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phone } = body as Partial<Operator>;
    if (!email || !name) {
      return NextResponse.json({ error: 'email and name are required' }, { status: 400 });
    }
    const id = Date.now().toString();
    await (pool as any).execute(
      'INSERT INTO bus_operators (id, email, name, phone, suspended) VALUES (?, ?, ?, ?, false)',
      [id, email, name, phone ?? '']
    );
    const newOp: Operator = { id, email, name, phone: phone ?? '', suspended: false };
    return NextResponse.json(newOp, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create operator' }, { status: 500 });
  }
}
