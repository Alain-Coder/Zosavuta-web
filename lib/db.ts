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
    price: typeof row.price === 'number' ? row.price : parseFloat(row.price || '0'),
    ticketsTotal: parseInt(row.ticketsTotal || '0', 10),
    ticketsAvailable: parseInt(row.ticketsAvailable || '0', 10),
    organizerId: row.organizerId || '',
    organizer: row.organizerName || 'Zosavuta Events',
    status: row.status || 'active',
    busTransport: Boolean(row.busTransport),
    seatingChart: Boolean(row.seatingChart),
    ticketTypes: typeof row.ticketTypes === 'string' ? (() => { try { return JSON.parse(row.ticketTypes); } catch { return []; } })() : (row.ticketTypes || []),
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
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function saveContactMessage(msg: ContactMessage): Promise<boolean> {
  try {
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

