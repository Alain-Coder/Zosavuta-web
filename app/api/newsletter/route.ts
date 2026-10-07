import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

/* ── POST /api/newsletter  ── subscribe an email */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const source = (body.source ?? "footer").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Upsert — if already subscribed just re-activate
    await execute(
      `INSERT INTO newsletter_subscribers (email, source, status)
       VALUES (?, ?, 'active')
       ON DUPLICATE KEY UPDATE status = 'active', unsubscribedAt = NULL`,
      [email, source]
    );

    return NextResponse.json({
      success: true,
      message: "You've been subscribed! Thank you for joining.",
    });
  } catch (err: any) {
    console.error("POST /api/newsletter error:", err);
    return NextResponse.json(
      { success: false, error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

/* ── GET /api/newsletter  ── admin: list subscribers */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId") ?? req.headers.get("x-admin-id") ?? "";

    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = searchParams.get("status") ?? "active";   // "active" | "unsubscribed" | "all"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
    const offset = (page - 1) * limit;

    const whereClause = status === "all" ? "" : "WHERE status = ?";
    const params: any[] = status === "all" ? [] : [status];

    const [countRows] = await Promise.all([
      query<{ total: number }>(
        `SELECT COUNT(*) AS total FROM newsletter_subscribers ${whereClause}`,
        params
      ),
    ]);

    const subscribers = await query(
      `SELECT id, email, status, source, subscribedAt, unsubscribedAt
       FROM newsletter_subscribers
       ${whereClause}
       ORDER BY subscribedAt DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const stats = await query<any>(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'active') AS active,
         SUM(status = 'unsubscribed') AS unsubscribed
       FROM newsletter_subscribers`
    );

    return NextResponse.json({
      subscribers,
      stats: stats[0] ?? { total: 0, active: 0, unsubscribed: 0 },
      total: countRows[0]?.total ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("GET /api/newsletter error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

/* ── DELETE /api/newsletter  ── unsubscribe */
export async function DELETE(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

    await execute(
      `UPDATE newsletter_subscribers
       SET status = 'unsubscribed', unsubscribedAt = NOW()
       WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    return NextResponse.json({ success: true, message: "Unsubscribed successfully." });
  } catch (err: any) {
    console.error("DELETE /api/newsletter error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
