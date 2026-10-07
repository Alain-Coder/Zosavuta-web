import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, hasAdminRole } from '@/lib/auth-server';

const CATEGORY_COLORS: Record<string, string> = {
  music: '#8B5CF6',
  sports: '#3B82F6',
  conference: '#10B981',
  festival: '#F59E0B',
  workshop: '#EF4444',
};

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!hasAdminRole(user, ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('dateFrom') || null;
  const dateTo = searchParams.get('dateTo') || null;
  const organizerParam = searchParams.get('organizer')?.trim() || null;

  // Build filter conditions for orders and physical tickets
  const orderDateCond = dateFrom && dateTo
    ? `AND o.createdAt BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`
    : dateFrom
      ? `AND o.createdAt >= ?`
      : dateTo
        ? `AND o.createdAt <= DATE_ADD(?, INTERVAL 1 DAY)`
        : '';
  const orderDateParams: string[] = dateFrom && dateTo
    ? [dateFrom, dateTo]
    : dateFrom
      ? [dateFrom]
      : dateTo
        ? [dateTo]
        : [];

  const ptDateCond = dateFrom && dateTo
    ? `AND pt.soldAt BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`
    : dateFrom
      ? `AND pt.soldAt >= ?`
      : dateTo
        ? `AND pt.soldAt <= DATE_ADD(?, INTERVAL 1 DAY)`
        : '';
  const ptDateParams: string[] = dateFrom && dateTo
    ? [dateFrom, dateTo]
    : dateFrom
      ? [dateFrom]
      : dateTo
        ? [dateTo]
        : [];

  const eventDateCond = dateFrom && dateTo
    ? `AND e.date BETWEEN ? AND ?`
    : dateFrom
      ? `AND e.date >= ?`
      : dateTo
        ? `AND e.date <= ?`
        : '';
  const eventDateParams: string[] = dateFrom && dateTo
    ? [dateFrom, dateTo]
    : dateFrom
      ? [dateFrom]
      : dateTo
        ? [dateTo]
        : [];

  const organizerCond = organizerParam
    ? `AND (u.fullName = ? OR u.fullName LIKE ? OR u.uid = ? OR e.organizerId = ?)`
    : '';
  const organizerSqlParams = organizerParam
    ? [organizerParam, `%${organizerParam}%`, organizerParam, organizerParam]
    : [];

  // --- Organizer list (derived from events table + registered organizers) ---
  const organizers = await query<{ uid: string; name: string; email: string | null; eventCount: number }>(
    `SELECT 
       COALESCE(u.uid, e.organizerId) AS uid,
       COALESCE(u.fullName, u.email, e.organizerId) AS name,
       u.email,
       COUNT(e.id) AS eventCount
     FROM events e
     LEFT JOIN users u ON u.uid = e.organizerId
     GROUP BY COALESCE(u.uid, e.organizerId), u.fullName, u.email, e.organizerId
     UNION
     SELECT 
       u.uid,
       COALESCE(u.fullName, u.email, 'Organizer') AS name,
       u.email,
       0 AS eventCount
     FROM users u
     WHERE u.role IN ('organizer', 'customer_organizer')
       AND u.uid NOT IN (SELECT DISTINCT organizerId FROM events WHERE organizerId IS NOT NULL)
     ORDER BY eventCount DESC, name ASC`
  );

  // --- Revenue: online orders ---
  const [onlineRevenueRow] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(o.totalAmount), 0) AS total
     FROM orders o
     LEFT JOIN events e ON e.id = o.eventId
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE o.status IN ('confirmed', 'used')
     ${orderDateCond} ${organizerCond}`,
    [...orderDateParams, ...organizerSqlParams]
  );

  // --- Revenue: physical tickets ---
  const [physicalRevenueRow] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(pt.price), 0) AS total
     FROM physical_tickets pt
     LEFT JOIN events e ON e.id = pt.eventId
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE pt.status IN ('SOLD', 'USED')
     ${ptDateCond} ${organizerCond}`,
    [...ptDateParams, ...organizerSqlParams]
  );

  const totalRevenue = Number(onlineRevenueRow?.total ?? 0) + Number(physicalRevenueRow?.total ?? 0);

  const [usersRow] = await query<{ count: number }>('SELECT COUNT(*) AS count FROM users');

  // --- Events counts from events table ---
  const [totalEventsRow] = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT e.id) AS count
     FROM events e
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE 1=1 ${eventDateCond} ${organizerCond}`,
    [...eventDateParams, ...organizerSqlParams]
  );

  const [activeEventsRow] = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT e.id) AS count
     FROM events e
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE e.status = 'active' ${eventDateCond} ${organizerCond}`,
    [...eventDateParams, ...organizerSqlParams]
  );

  // --- Online tickets sold ---
  const [onlineTicketsRow] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(o.quantity), 0) AS total
     FROM orders o
     LEFT JOIN events e ON e.id = o.eventId
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE o.status IN ('confirmed', 'used')
     ${orderDateCond} ${organizerCond}`,
    [...orderDateParams, ...organizerSqlParams]
  );

  // --- Physical tickets sold ---
  const [physicalTicketsRow] = await query<{ total: number }>(
    `SELECT COALESCE(COUNT(*), 0) AS total
     FROM physical_tickets pt
     LEFT JOIN events e ON e.id = pt.eventId
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE pt.status IN ('SOLD', 'USED')
     ${ptDateCond} ${organizerCond}`,
    [...ptDateParams, ...organizerSqlParams]
  );

  const ticketsSold = Number(onlineTicketsRow?.total ?? 0) + Number(physicalTicketsRow?.total ?? 0);

  const [pendingRow] = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM event_submissions
     WHERE status = 'pending' AND ticketDetailsSubmitted = 1`
  );

  const revenueByWeek = await query<{ week: string; revenue: number }>(
    `SELECT DATE_FORMAT(o.createdAt, '%Y-%m-%d') AS week,
            SUM(o.totalAmount) AS revenue
     FROM orders o
     LEFT JOIN events e ON e.id = o.eventId
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE o.status IN ('confirmed', 'used')
       AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
     ${orderDateCond} ${organizerCond}
     GROUP BY DATE_FORMAT(o.createdAt, '%Y-%U')
     ORDER BY week ASC`,
    [...orderDateParams, ...organizerSqlParams]
  );

  const eventsByCategory = await query<{ category: string; count: number }>(
    `SELECT e.category, COUNT(*) AS count
     FROM events e
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE e.status = 'active' ${organizerCond}
     GROUP BY e.category`,
    [...organizerSqlParams]
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
     LEFT JOIN users u ON u.uid = e.organizerId
     WHERE e.status = 'active' ${organizerCond}
     GROUP BY e.category`,
    [...organizerSqlParams]
  );

  const topEvents = await query<{
    title: string;
    ticketsSold: number;
    revenue: number;
    organizerName: string;
  }>(
    `SELECT e.title,
            COALESCE(u.fullName, u.email, 'Organizer') AS organizerName,
            COALESCE(SUM(o.quantity), 0) + COALESCE(pt.physicalSold, 0) AS ticketsSold,
            COALESCE(SUM(o.totalAmount), 0) + COALESCE(pt.physicalRev, 0) AS revenue
     FROM events e
     LEFT JOIN orders o ON o.eventId = e.id AND o.status IN ('confirmed', 'used')
     LEFT JOIN users u ON u.uid = e.organizerId
     LEFT JOIN (
       SELECT eventId,
              SUM(status IN ('SOLD','USED')) AS physicalSold,
              SUM(CASE WHEN status IN ('SOLD','USED') THEN price ELSE 0 END) AS physicalRev
       FROM physical_tickets GROUP BY eventId
     ) pt ON pt.eventId = e.id
     WHERE e.status IN ('active', 'sold_out', 'completed') ${organizerCond}
     GROUP BY e.id, e.title, u.fullName, u.email, pt.physicalSold, pt.physicalRev
     ORDER BY revenue DESC, ticketsSold DESC
     LIMIT 8`,
    [...organizerSqlParams]
  );

  // --- Fetch all organizer events from the events table for accurate overview ---
  const allEvents = await query<{
    id: number;
    title: string;
    description: string;
    category: string;
    date: string;
    time: string;
    location: string;
    venue: string;
    image: string | null;
    price: number;
    ticketsTotal: number;
    ticketsAvailable: number;
    status: string;
    organizerId: string;
    organizerName: string;
    organizerEmail: string | null;
    busTransport: number;
    seatingChart: number;
    createdAt: string;
    ticketsSold: number;
    revenue: number;
  }>(
    `SELECT 
       e.id,
       e.title,
       e.description,
       e.category,
       DATE_FORMAT(e.date, '%Y-%m-%d') AS date,
       e.time,
       e.location,
       e.venue,
       e.image,
       e.price,
       e.ticketsTotal,
       e.ticketsAvailable,
       e.status,
       e.organizerId,
       COALESCE(u.fullName, u.email, 'Organizer') AS organizerName,
       u.email AS organizerEmail,
       e.busTransport,
       e.seatingChart,
       e.createdAt,
       COALESCE(ord.onlineSold, 0) + COALESCE(pt.physicalSold, 0) AS ticketsSold,
       COALESCE(ord.onlineRevenue, 0) + COALESCE(pt.physicalRevenue, 0) AS revenue
     FROM events e
     LEFT JOIN users u ON u.uid = e.organizerId
     LEFT JOIN (
       SELECT eventId,
              SUM(quantity) AS onlineSold,
              SUM(totalAmount) AS onlineRevenue
       FROM orders
       WHERE status IN ('confirmed', 'used')
       GROUP BY eventId
     ) ord ON ord.eventId = e.id
     LEFT JOIN (
       SELECT eventId,
              SUM(status IN ('SOLD','USED')) AS physicalSold,
              SUM(CASE WHEN status IN ('SOLD','USED') THEN price ELSE 0 END) AS physicalRevenue
       FROM physical_tickets
       GROUP BY eventId
     ) pt ON pt.eventId = e.id
     WHERE 1=1
     ${eventDateCond}
     ${organizerCond}
     ORDER BY e.date DESC, e.createdAt DESC`,
    [...eventDateParams, ...organizerSqlParams]
  );

  return NextResponse.json({
    stats: {
      totalRevenue,
      totalUsers: Number(usersRow?.count ?? 0),
      activeEvents: Number(activeEventsRow?.count ?? 0),
      totalEvents: Number(totalEventsRow?.count ?? 0),
      ticketsSold,
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
      organizerName: e.organizerName,
    })),
    organizers: organizers.map((o) => ({
      uid: o.uid,
      name: o.name,
      email: o.email || '',
      eventCount: Number(o.eventCount || 0),
    })),
    events: allEvents.map((e) => ({
      id: Number(e.id),
      title: e.title,
      description: e.description,
      category: e.category,
      date: e.date,
      time: String(e.time || ''),
      location: e.location,
      venue: e.venue,
      image: e.image,
      price: Number(e.price || 0),
      ticketsTotal: Number(e.ticketsTotal || 0),
      ticketsAvailable: Number(e.ticketsAvailable || 0),
      status: e.status,
      organizerId: e.organizerId,
      organizerName: e.organizerName,
      organizerEmail: e.organizerEmail || '',
      ticketsSold: Number(e.ticketsSold || 0),
      revenue: Number(e.revenue || 0),
      busTransport: Boolean(e.busTransport),
      seatingChart: Boolean(e.seatingChart),
      createdAt: String(e.createdAt || ''),
    })),
  });
}
