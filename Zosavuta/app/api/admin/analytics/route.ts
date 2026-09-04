import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-server';

const CATEGORY_COLORS: Record<string, string> = {
  music: '#8B5CF6',
  sports: '#3B82F6',
  conference: '#10B981',
  festival: '#F59E0B',
  workshop: '#EF4444',
};

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [revenueRow] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(totalAmount), 0) AS total
     FROM orders WHERE status IN ('confirmed', 'used')`
  );

  const [usersRow] = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM users'
  );

  const [eventsRow] = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM events WHERE status = 'active'`
  );

  const [ticketsRow] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(quantity), 0) AS total
     FROM orders WHERE status IN ('confirmed', 'used')`
  );

  const [pendingRow] = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM event_submissions
     WHERE status = 'pending' AND ticketDetailsSubmitted = 1`
  );

  const revenueByWeek = await query<{ week: string; revenue: number }>(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS week,
            SUM(totalAmount) AS revenue
     FROM orders
     WHERE status IN ('confirmed', 'used')
       AND createdAt >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
     GROUP BY DATE_FORMAT(createdAt, '%Y-%U')
     ORDER BY week ASC`
  );

  const eventsByCategory = await query<{ category: string; count: number }>(
    `SELECT category, COUNT(*) AS count
     FROM events WHERE status = 'active'
     GROUP BY category`
  );

  const ticketSalesByCategory = await query<{
    category: string;
    sold: number;
    available: number;
  }>(
    `SELECT e.category,
            COALESCE(SUM(o.quantity), 0) AS sold,
            COALESCE(SUM(e.ticketsAvailable), 0) AS available
     FROM events e
     LEFT JOIN orders o ON o.eventId = e.id AND o.status IN ('confirmed', 'used')
     WHERE e.status = 'active'
     GROUP BY e.category`
  );

  const topEvents = await query<{
    title: string;
    ticketsSold: number;
    revenue: number;
  }>(
    `SELECT e.title,
            COALESCE(SUM(o.quantity), 0) AS ticketsSold,
            COALESCE(SUM(o.totalAmount), 0) AS revenue
     FROM events e
     LEFT JOIN orders o ON o.eventId = e.id AND o.status IN ('confirmed', 'used')
     WHERE e.status = 'active'
     GROUP BY e.id, e.title
     ORDER BY revenue DESC
     LIMIT 5`
  );

  return NextResponse.json({
    stats: {
      totalRevenue: Number(revenueRow?.total ?? 0),
      totalUsers: Number(usersRow?.count ?? 0),
      activeEvents: Number(eventsRow?.count ?? 0),
      ticketsSold: Number(ticketsRow?.total ?? 0),
      pendingSubmissions: Number(pendingRow?.count ?? 0),
    },
    revenueByWeek: revenueByWeek.map((r) => ({
      date: r.week,
      revenue: Number(r.revenue),
    })),
    eventsByCategory: eventsByCategory.map((e) => ({
      name: e.category.charAt(0).toUpperCase() + e.category.slice(1),
      value: Number(e.count),
      color: CATEGORY_COLORS[e.category] || '#6B7280',
    })),
    ticketSalesByCategory: ticketSalesByCategory.map((t) => ({
      category: t.category.charAt(0).toUpperCase() + t.category.slice(1),
      sold: Number(t.sold),
      available: Number(t.available),
    })),
    topEvents: topEvents.map((e) => ({
      name: e.title,
      ticketsSold: Number(e.ticketsSold),
      revenue: Number(e.revenue),
    })),
  });
}
