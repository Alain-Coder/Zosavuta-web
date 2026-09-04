import { NextRequest, NextResponse } from 'next/server';
import { reconcilePendingPayments } from '@/lib/reconciliation';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  const report = await reconcilePendingPayments();
  return NextResponse.json({ success: true, report });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
