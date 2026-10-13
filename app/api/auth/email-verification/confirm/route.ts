import { NextRequest, NextResponse } from 'next/server';
import { confirmEmailVerification } from '@/lib/email-verification';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.token !== 'string') {
    return NextResponse.json({ error: 'A verification token is required.' }, { status: 400 });
  }

  try {
    await confirmEmailVerification(body.token);
    return NextResponse.json({ verified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify this email address.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
