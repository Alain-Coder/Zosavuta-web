import mysql from 'mysql2/promise';

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'zosavuta',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

/** Typed query helper */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/** For INSERT/UPDATE/DELETE – returns affected rows + insertId */
export async function execute(sql: string, params?: any[]) {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}
