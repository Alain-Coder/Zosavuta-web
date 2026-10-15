import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';
import { getKycUploadDirectory } from '@/lib/kyc-storage';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { filename } = await params;
  const match = /^kyc-([A-Za-z0-9_-]+)-\d+\.(jpg|png|webp|pdf)$/.exec(filename);
  if (!match) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  if (match[1] !== user.uid && !hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const safeFilename = path.basename(filename);
    let document: Buffer;
    try {
      document = await readFile(path.join(getKycUploadDirectory(), safeFilename));
    } catch {
      // Support documents uploaded before they were moved out of Next.js public assets.
      document = await readFile(path.join(process.cwd(), 'public', 'uploads', 'kyc', safeFilename));
    }

    return new NextResponse(new Uint8Array(document), {
      headers: {
        'Content-Type': contentTypes[match[2]],
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}