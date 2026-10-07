import { NextResponse } from 'next/server';
import { saveContactMessage } from '@/lib/db';

// Field length limits to prevent large payload injection / column overflow
const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254; // RFC 5321 max email length
const MAX_SUBJECT_LEN = 200;
const MAX_MESSAGE_LEN = 5000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Please complete all required fields.' },
        { status: 400 }
      );
    }

    // Length validation
    if (String(name).length > MAX_NAME_LEN)
      return NextResponse.json({ success: false, error: 'Name is too long.' }, { status: 400 });
    if (String(email).length > MAX_EMAIL_LEN)
      return NextResponse.json({ success: false, error: 'Email address is too long.' }, { status: 400 });
    if (String(subject).length > MAX_SUBJECT_LEN)
      return NextResponse.json({ success: false, error: 'Subject is too long.' }, { status: 400 });
    if (String(message).length > MAX_MESSAGE_LEN)
      return NextResponse.json({ success: false, error: 'Message is too long (max 5000 characters).' }, { status: 400 });

    // Email format check (tighter than a simple .includes('@'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const saved = await saveContactMessage({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to submit inquiry to the database. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been received! Our support team will get back to you shortly.',
    });
  } catch (error: any) {
    console.error('API /api/contact Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
