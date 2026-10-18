import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getEventUploadDirectory } from '@/lib/event-storage';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const match = /^([A-Za-z0-9_-]+-\d+\.(jpg|png|webp))$/i.exec(filename);
  if (!match) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  try {
    const safeFilename = path.basename(filename);
    let image: Buffer;
    try {
      image = await readFile(path.join(getEventUploadDirectory(), safeFilename));
    } catch {
      image = await readFile(path.join(process.cwd(), 'public', 'uploads', 'events', safeFilename));
    }

    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': contentTypes[match[2].toLowerCase()],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}