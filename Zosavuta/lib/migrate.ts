/**
 * Run pending SQL migrations
 * Usage: npm run db:migrate
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  await loadEnv();

  const url = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/zosavuta';
  const conn = await mysql.createConnection(url);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`\n▶ Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⚠ Skipped (already applied): ${e.message}`);
        } else if (e.message?.includes('Duplicate column name')) {
          console.log(`  ⚠ Skipped (already applied): ${e.message}`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ ${file} complete`);
  }

  await conn.end();
  console.log('\n✔ All migrations applied.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
