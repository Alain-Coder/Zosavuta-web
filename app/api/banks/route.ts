import { NextRequest, NextResponse } from 'next/server';
import { getSupportedBanks } from '@/lib/paychangu-payouts';

/**
 * GET /api/banks
 * Returns the currently supported payout banking institutions from PayChangu.
 * Per PAYCHANGU_BANK_CODES_AND_PAYOUTS.md, organizers can only withdraw via Bank Transfer.
 */
export async function GET(req: NextRequest) {
  try {
    const includeMobile = req.nextUrl.searchParams.get('includeMobile') === 'true';
    const banks = await getSupportedBanks(includeMobile);
    return NextResponse.json({
      status: 'success',
      banks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch supported banks' },
      { status: 500 }
    );
  }
}
