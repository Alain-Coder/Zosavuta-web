import pool, { query } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

export interface AuditLogEntry {
  id?: number;
  actorId: string;
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

export async function getFinancialAuditLogs(limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
  const rows = await query<any>(
    `SELECT id, actorId, actorRole, action, entityType, entityId, oldValues, newValues, ipAddress, createdAt
     FROM financial_audit_logs
     ORDER BY createdAt DESC, id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    actorId: String(r.actorId),
    actorRole: String(r.actorRole),
    action: String(r.action),
    entityType: String(r.entityType),
    entityId: String(r.entityId),
    oldValues: r.oldValues ? (typeof r.oldValues === 'string' ? JSON.parse(r.oldValues) : r.oldValues) : null,
    newValues: r.newValues ? (typeof r.newValues === 'string' ? JSON.parse(r.newValues) : r.newValues) : null,
    ipAddress: r.ipAddress ? String(r.ipAddress) : undefined,
    createdAt: String(r.createdAt),
  }));
}
