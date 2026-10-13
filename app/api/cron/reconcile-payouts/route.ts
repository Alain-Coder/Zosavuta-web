import { NextRequest, NextResponse } from 'next/server';
import { reconcileStalePayouts } from '@/lib/payout-reconciliation-job';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Cron endpoint is not configured' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const report = await reconcileStalePayouts();
    return NextResponse.json({ success: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payout reconciliation failed';
    console.error('Scheduled reconciliation failed', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
