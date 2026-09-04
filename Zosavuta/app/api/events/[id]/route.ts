import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query('SELECT * FROM events WHERE id = ?', [id]);
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const fields = Object.keys(body).filter(k => k !== 'id');
  const set = fields.map(f => `${f} = ?`).join(', ');
  const vals = fields.map(f => body[f]);
  await execute(`UPDATE events SET ${set} WHERE id = ?`, [...vals, id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await execute('DELETE FROM events WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
