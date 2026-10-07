import pool, { query } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

export interface AuditLogEntry {
  id?: number;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  createdAt?: string;
}

export async function logFinancialAudit(
  entry: AuditLogEntry,
  connection?: PoolConnection
) {
  const executor = connection || pool;
  await executor.execute(
    `INSERT INTO financial_audit_logs (actorId, actorRole, action, entityType, entityId, oldValues, newValues, ipAddress)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorId,
      entry.actorRole || 'SYSTEM_ADMINISTRATOR',
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.ipAddress || null,
    ]
  );
}

export async function getFinancialAuditLogs(
  limit: number = 20,
  offset: number = 0,
  search?: string
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const trimmed = search?.trim();
  const searchClause = trimmed
    ? `WHERE l.action LIKE ? OR l.entityType LIKE ? OR l.entityId LIKE ? OR u.fullName LIKE ? OR u.email LIKE ? OR l.actorId LIKE ?`
    : '';
  const searchParams = trimmed
    ? [`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`]
    : [];

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM financial_audit_logs l
     LEFT JOIN users u ON u.uid = l.actorId OR u.email = l.actorId
     ${searchClause}`,
    searchParams
  );

  const rows = await query<any>(
    `SELECT 
       l.id, 
       l.actorId, 
       l.actorRole, 
       l.action, 
       l.entityType, 
       l.entityId, 
       l.oldValues, 
       l.newValues, 
       l.ipAddress, 
       l.createdAt,
       COALESCE(u.fullName, u.email, l.actorId) AS actorName,
       u.email AS actorEmail
     FROM financial_audit_logs l
     LEFT JOIN users u ON u.uid = l.actorId OR u.email = l.actorId
     ${searchClause}
     ORDER BY l.createdAt DESC, l.id DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset]
  );

  const logs: AuditLogEntry[] = rows.map((r: any) => ({
    id: Number(r.id),
    actorId: String(r.actorId),
    actorName: r.actorName ? String(r.actorName) : String(r.actorId),
    actorEmail: r.actorEmail ? String(r.actorEmail) : undefined,
    actorRole: String(r.actorRole),
    action: String(r.action),
    entityType: String(r.entityType),
    entityId: String(r.entityId),
    oldValues: r.oldValues ? (typeof r.oldValues === 'string' ? JSON.parse(r.oldValues) : r.oldValues) : null,
    newValues: r.newValues ? (typeof r.newValues === 'string' ? JSON.parse(r.newValues) : r.newValues) : null,
    ipAddress: r.ipAddress ? String(r.ipAddress) : undefined,
    createdAt: String(r.createdAt),
  }));

  return { logs, total: Number(countRow?.total ?? 0) };
}
