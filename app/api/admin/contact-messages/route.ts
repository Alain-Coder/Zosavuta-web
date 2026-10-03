import { NextRequest, NextResponse } from 'next/server';
import {
  getContactMessages,
  getContactMessagesStats,
  updateContactMessageStatus,
  deleteContactMessage,
} from '@/lib/db';
import { getUserAdminRole } from '@/lib/security-controls';

async function authenticateAdmin(req: NextRequest, bodyAdminId?: string) {
  const adminId =
    req.headers.get('x-admin-id') ||
    req.nextUrl.searchParams.get('adminId') ||
    bodyAdminId;

  if (!adminId) {
    return { ok: false, error: 'Authentication required', status: 401, adminId: null };
  }

  const adminRole = await getUserAdminRole(adminId);
  if (!adminRole) {
    return { ok: false, error: 'Insufficient permissions. System Admin or Accountant required.', status: 403, adminId: null };
  }

  return { ok: true, adminId, role: adminRole };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;

    const [messagesData, stats] = await Promise.all([
      getContactMessages({ search, status, page, limit }),
      getContactMessagesStats(),
    ]);

    return NextResponse.json({
      success: true,
      ...messagesData,
      stats,
    });
  } catch (error: any) {
    console.error('API /api/admin/contact-messages GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch contact messages' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await authenticateAdmin(req, body.adminId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, status } = body;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    if (!status || !['unread', 'read', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status required: "unread", "read", or "resolved"' },
        { status: 400 }
      );
    }

    const updated = await updateContactMessageStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Message not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    console.error('API /api/admin/contact-messages PATCH Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update contact message' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let id = req.nextUrl.searchParams.get('id');
    let bodyAdminId: string | undefined;

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
      bodyAdminId = body.adminId;
    }

    const auth = await authenticateAdmin(req, bodyAdminId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const deleted = await deleteContactMessage(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Message not found or delete failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('API /api/admin/contact-messages DELETE Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete contact message' },
      { status: 500 }
    );
  }
}
