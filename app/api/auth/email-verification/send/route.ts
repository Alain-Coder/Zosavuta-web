import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { sendVerificationEmail } from '@/lib/email-verification';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req, true);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ verified: true, message: 'Your email address is already verified.' });

  try {
    await sendVerificationEmail(user.uid);
    return NextResponse.json({
      sent: true,
      message: 'Check your inbox and spam or junk folder for the verification email.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send the verification email.';
    const status = message.startsWith('Too many') ? 429 : 500;
    console.error('Email verification delivery failed:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
