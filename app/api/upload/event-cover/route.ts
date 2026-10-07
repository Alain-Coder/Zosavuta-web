import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { getAuthUser, canOrganizeEvents } from '@/lib/auth-server';
import { checkOrganizerIsApproved } from '@/lib/organizer-verification';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Forbidden — organizer role required' }, { status: 403 });
    }

    if (user.role !== 'admin') {
      const isApproved = await checkOrganizerIsApproved(user.uid);
      if (!isApproved) {
        return NextResponse.json(
          { error: 'Organizer verification required. Your account must be verified and approved before uploading event covers.' },
          { status: 403 }
        );
      }
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be 5 MB or smaller' }, { status: 400 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${user.uid}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'events');

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/events/${filename}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!canOrganizeEvents(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const url: string = body.url || '';
    // Only allow deleting files that belong to this user within the events upload folder
    if (!url.startsWith('/uploads/events/') || url.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }
    const filename = path.basename(url);
    // Safety: filename must start with the user's uid so they can only delete their own files
    if (!filename.startsWith(user.uid)) {
      return NextResponse.json({ error: 'You can only delete your own uploads' }, { status: 403 });
    }
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'events', filename);
    await unlink(filePath).catch(() => {}); // ignore if already gone
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
