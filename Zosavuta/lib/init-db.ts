/**
 * Database initialization script
 * Run: npx tsx lib/init-db.ts
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function main() {
  const url = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306';
  // Connect without a database name so we can CREATE DATABASE first
  const conn = await mysql.createConnection(url.includes('/zosavuta')
    ? url.replace(/\/zosavuta.*$/, '')
    : url
  );

  const sqlPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split on semicolons (skip empty)
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log(`✓ ${stmt.split('\n')[0].slice(0, 72)}`);
    } catch (err: any) {
      // Ignore "already exists" errors for DB and tables
      if (err.code === 'ER_DB_CREATE_EXISTS' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`⚠ Already exists – skipping: ${stmt.split('\n')[0].slice(0, 72)}`);
      } else {
        console.error('✗', err.message);
      }
    }
  }

  await conn.end();
  console.log('\n✔ Schema applied successfully.');
}

main().catch((err) => {
  console.error('Init failed:', err);
  process.exit(1);
});
