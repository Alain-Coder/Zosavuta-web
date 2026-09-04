import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tickets = await query('SELECT ticketNumber FROM order_tickets WHERE orderId = ?', [id]);
  const order = { ...rows[0], ticketNumbers: tickets.map((t: any) => t.ticketNumber) };

  return NextResponse.json(order);
}
