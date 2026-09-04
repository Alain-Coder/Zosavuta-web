import { NextRequest, NextResponse } from 'next/server';
import { getTicketOwnershipHistory } from '@/lib/tickets';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = Number(params.id);
    if (!ticketId || isNaN(ticketId)) {
      return NextResponse.json({ error: 'Valid numerical ticket ID is required' }, { status: 400 });
    }

    const history = await getTicketOwnershipHistory(ticketId);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch ticket ownership history' }, { status: 500 });
  }
}
