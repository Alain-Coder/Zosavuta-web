import { NextResponse } from 'next/server';
import { getEventByIdFromDB } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
    }
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const event = await getEventByIdFromDB(id.toLowerCase());
    if (!event || event.status !== 'active' || event.date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('API /api/events/[id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
