import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Operator } from '@/types/operator';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Operator id required' }, { status: 400 });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, phone, suspended FROM operators WHERE id = ?',
      [id]
    );
    const operators = rows as Operator[];
    const op = operators[0];
    if (!op) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }
    return NextResponse.json(op);
  } catch (error) {
    console.error('Operator GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Operator id required' }, { status: 400 });
  }

  const { email, name, phone, suspended } = (await req.json()) as Partial<Operator>;
  const fields: string[] = [];
  const values: unknown[] = [];
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push('phone = ?');
    values.push(phone);
  }
  if (suspended !== undefined) {
    fields.push('suspended = ?');
    values.push(suspended);
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sql = `UPDATE operators SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  try {
    await pool.execute(sql, values as (string | number | null)[]);
    const [updatedRows] = await pool.query(
      'SELECT id, email, name, phone, suspended FROM operators WHERE id = ?',
      [id]
    );
    const updated = (updatedRows as Operator[])[0];
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Operator PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Operator id required' }, { status: 400 });
  }

  try {
    await pool.execute('UPDATE operators SET suspended = true WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Operator DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
