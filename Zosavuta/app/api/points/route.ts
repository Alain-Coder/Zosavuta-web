import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const rows = await query(
    'SELECT * FROM points_ledger WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );

  const balance = rows.reduce((sum, r: any) =>
    r.type === 'earned' ? sum + r.points : sum - r.points, 0
  );

  // Count distinct orders that earned points
  const orderRows = await query(
    'SELECT COUNT(DISTINCT relatedOrderId) as cnt FROM points_ledger WHERE userId = ? AND type = \'earned\' AND relatedOrderId IS NOT NULL',
    [userId]
  );
  const bookingCount = (orderRows[0] as any)?.cnt ?? 0;

  return NextResponse.json({ balance, totalPoints: balance, bookingCount, history: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, points, type = 'earned', description, relatedOrderId } = body;
  const result = await execute(
    `INSERT INTO points_ledger (userId, points, type, description, relatedOrderId)
     VALUES (?,?,?,?,?)`,
    [userId, points, type, description || null, relatedOrderId || null]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
