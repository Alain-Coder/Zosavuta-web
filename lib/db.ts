import mysql, { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

export interface Event {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  price: number;
  ticketsTotal: number;
  ticketsAvailable: number;
  ticketTypes?: Array<{ name: string; price: number }>;
  organizerId: string;
  organizer?: string;
  status: 'active' | 'draft' | 'sold_out' | 'cancelled';
  busTransport: boolean;
  seatingChart: boolean;
  createdAt?: string;
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'zosavuta',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);
  return result as ResultSetHeader;
}

export type { Pool, PoolConnection };

// Default export — pool instance for files that do `import pool from '@/lib/db'`
export default getPool();


export function formatRowToEvent(row: any): Event {
  let formattedDate = row.date;
  if (row.date instanceof Date) {
    const day = String(row.date.getDate()).padStart(2, '0');
    const month = row.date.toLocaleString('en-GB', { month: 'short' });
    const year = row.date.getFullYear();
    formattedDate = `${day} ${month} ${year}`;
  } else if (typeof row.date === 'string' && row.date.includes('T')) {
    const dateObj = new Date(row.date);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = dateObj.toLocaleString('en-GB', { month: 'short' });
      const year = dateObj.getFullYear();
      formattedDate = `${day} ${month} ${year}`;
    } else {
      formattedDate = row.date.split('T')[0];
    }
  }

  const rawPrice = typeof row.price === 'number' ? row.price : parseFloat(row.price || '0');
  // Only return organizer-configured ticket types — no auto-calculation for missing tiers
  let parsedTicketTypes: Array<{ name: string; price: number }> = [];
  if (typeof row.ticketTypes === 'string') {
    try {
      parsedTicketTypes = JSON.parse(row.ticketTypes);
    } catch {
      parsedTicketTypes = [];
    }
  } else if (Array.isArray(row.ticketTypes)) {
    parsedTicketTypes = row.ticketTypes;
  }

  // Legacy fallback: events with no stored ticketTypes get a single Standard entry
  if (!Array.isArray(parsedTicketTypes) || parsedTicketTypes.length === 0) {
    const basePrice = rawPrice > 0 ? rawPrice : 3500;
    parsedTicketTypes = [{ name: 'Standard', price: basePrice }];
  }

  return {
    id: String(row.id),
    title: row.title || '',
    description: row.description || '',
    fullDescription: row.fullDescription || row.description || '',
    category: row.category || 'music',
    date: formattedDate || '',
    time: row.time ? String(row.time).substring(0, 5) : '',
    location: row.location || '',
    venue: row.venue || '',
    image: row.image || '/images/hero-bg.jpg',
    price: rawPrice,
    ticketsTotal: parseInt(row.ticketsTotal || '0', 10),
    ticketsAvailable: parseInt(row.ticketsAvailable || '0', 10),
    organizerId: row.organizerId || '',
    organizer: row.organizerName || 'Zosavuta Events',
    status: row.status || 'active',
    busTransport: Boolean(row.busTransport),
    seatingChart: Boolean(row.seatingChart),
    ticketTypes: parsedTicketTypes,
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
  };
}

export async function getEventsFromDB(category?: string, search?: string): Promise<Event[]> {
  try {
    const dbPool = getPool();
    let query = `
      SELECT e.*, u.fullName as organizerName
      FROM events e
      LEFT JOIN users u ON e.organizerId = u.uid
      WHERE e.status = 'active' AND (e.date > CURDATE() OR (e.date = CURDATE() AND e.time >= CURTIME()))
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ` AND e.category = ?`;
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ` AND (e.title LIKE ? OR e.location LIKE ? OR e.venue LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY e.date ASC`;

    const [rows] = await dbPool.execute(query, params);
    if (!Array.isArray(rows)) return [];

    return rows.map(formatRowToEvent);
  } catch (error) {
    console.error('Error querying events from MySQL database:', error);
    return [];
  }
}

export async function getEventByIdFromDB(id: string | number): Promise<Event | null> {
  try {
    const dbPool = getPool();
    const query = `
      SELECT e.*, u.fullName as organizerName
      FROM events e
      LEFT JOIN users u ON e.organizerId = u.uid
      WHERE e.id = ?
      LIMIT 1
    `;

    const [rows] = await dbPool.execute(query, [id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return formatRowToEvent(rows[0]);
  } catch (error) {
    console.error(`Error querying event ID ${id} from MySQL database:`, error);
    return null;
  }
}

export interface ContactMessage {
  id?: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: 'unread' | 'read' | 'resolved';
  createdAt?: string;
}

export async function ensureContactMessagesTable(): Promise<void> {
  try {
    const dbPool = getPool();
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('unread','read','resolved') NOT NULL DEFAULT 'unread',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contact_messages_email (email),
        INDEX idx_contact_messages_status (status)
      ) ENGINE=InnoDB;
    `);
  } catch (error) {
    console.error('Error ensuring contact_messages table exists:', error);
  }
}

export async function saveContactMessage(msg: ContactMessage): Promise<boolean> {
  try {
    await ensureContactMessagesTable();
    const dbPool = getPool();

    await dbPool.execute(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
      [msg.name, msg.email, msg.subject, msg.message]
    );
    return true;
  } catch (error) {
    console.error('Error saving contact message to MySQL database:', error);
    return false;
  }
}

export interface GetContactMessagesParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getContactMessages(params: GetContactMessagesParams = {}): Promise<{
  messages: ContactMessage[];
  total: number;
  page: number;
  limit: number;
}> {
  await ensureContactMessagesTable();
  const dbPool = getPool();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (params.status && params.status !== 'all') {
    whereClauses.push(`status = ?`);
    queryParams.push(params.status);
  }

  if (params.search && params.search.trim()) {
    const searchPattern = `%${params.search.trim()}%`;
    whereClauses.push(`(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)`);
    queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM contact_messages ${whereSql}`;
  const [countRows] = await dbPool.execute(countSql, queryParams);
  const total = Number((countRows as any)?.[0]?.total || 0);

  const dataSql = `SELECT * FROM contact_messages ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  const [rows] = await dbPool.query(dataSql, [...queryParams, limit, offset]);

  const messages: ContactMessage[] = Array.isArray(rows)
    ? rows.map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || ''),
      email: String(r.email || ''),
      subject: String(r.subject || ''),
      message: String(r.message || ''),
      status: (r.status as 'unread' | 'read' | 'resolved') || 'unread',
      createdAt: r.createdAt ? String(r.createdAt) : undefined,
    }))
    : [];

  return { messages, total, page, limit };
}

export async function getContactMessagesStats(): Promise<{
  total: number;
  unread: number;
  read: number;
  resolved: number;
}> {
  await ensureContactMessagesTable();
  try {
    const dbPool = getPool();
    const [rows] = await dbPool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as readCount,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
      FROM contact_messages
    `);
    const r = (rows as any)?.[0] || {};
    return {
      total: Number(r.total || 0),
      unread: Number(r.unread || 0),
      read: Number(r.readCount || 0),
      resolved: Number(r.resolved || 0),
    };
  } catch (error) {
    console.error('Error getting contact message stats:', error);
    return { total: 0, unread: 0, read: 0, resolved: 0 };
  }
}

export async function updateContactMessageStatus(
  id: number | string,
  status: 'unread' | 'read' | 'resolved'
): Promise<boolean> {
  await ensureContactMessagesTable();
  try {
    const dbPool = getPool();
    const [result] = await dbPool.execute(
      `UPDATE contact_messages SET status = ? WHERE id = ?`,
      [status, id]
    );
    return (result as ResultSetHeader).affectedRows > 0;
  } catch (error) {
    console.error('Error updating contact message status:', error);
    return false;
  }
}

export async function deleteContactMessage(id: number | string): Promise<boolean> {
  await ensureContactMessagesTable();
  try {
    const dbPool = getPool();
    const [result] = await dbPool.execute(
      `DELETE FROM contact_messages WHERE id = ?`,
      [id]
    );
    return (result as ResultSetHeader).affectedRows > 0;
  } catch (error) {
    console.error('Error deleting contact message:', error);
    return false;
  }
}


