import { NextResponse } from 'next/server';
import { getEventsFromDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const events = await getEventsFromDB(category, search);
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error('API /api/events Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events', events: [] },
      { status: 500 }
    );
  }
}
