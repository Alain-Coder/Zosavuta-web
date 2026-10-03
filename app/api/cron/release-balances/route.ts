import { NextRequest, NextResponse } from 'next/server';
import { releaseEligiblePendingBalances } from '@/lib/payout-eligibility';

/**
 * Cron endpoint to periodically check organizer events,
 * transition ended events to 'completed', and release pending balances
 * into available balances so organizers can request withdrawals.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const releasedCount = await releaseEligiblePendingBalances();
    return NextResponse.json({
      success: true,
      releasedCount,
      message: `Successfully released pending balances for ${releasedCount} eligible transactions from concluded events.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Balance release failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
