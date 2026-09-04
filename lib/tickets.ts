import pool, { query } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

export interface OwnershipHistoryRecord {
  id: number;
  ticketId: number;
  ticketNumber: string;
  fromOwnerId: string | null;
  fromOwnerName?: string | null;
  toOwnerId: string;
  toOwnerName?: string | null;
  orderId: string | null;
  resaleListingId: string | null;
  createdAt: string;
}

export async function recordTicketOwnershipHistory(
  ticketId: number,
  fromOwnerId: string | null,
  toOwnerId: string,
  orderId?: string | null,
  resaleListingId?: string | null,
  connection?: PoolConnection
) {
  const executor = connection || pool;
  await executor.execute(
    `INSERT INTO ticket_ownership_history (ticketId, fromOwnerId, toOwnerId, orderId, resaleListingId)
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, fromOwnerId || null, toOwnerId, orderId || null, resaleListingId || null]
  );
}

export async function getTicketOwnershipHistory(ticketId: number): Promise<OwnershipHistoryRecord[]> {
  const sql = `
    SELECT 
      h.id,
      h.ticketId,
      t.ticketNumber,
      h.fromOwnerId,
      uFrom.fullName as fromOwnerName,
      h.toOwnerId,
      uTo.fullName as toOwnerName,
      h.orderId,
      h.resaleListingId,
      h.createdAt
    FROM ticket_ownership_history h
    JOIN order_tickets t ON h.ticketId = t.id
    LEFT JOIN users uFrom ON h.fromOwnerId = uFrom.uid
    JOIN users uTo ON h.toOwnerId = uTo.uid
    WHERE h.ticketId = ?
    ORDER BY h.createdAt ASC, h.id ASC
  `;
  const rows = await query<any>(sql, [ticketId]);
  return rows.map((r: any) => ({
    id: Number(r.id),
    ticketId: Number(r.ticketId),
    ticketNumber: String(r.ticketNumber),
    fromOwnerId: r.fromOwnerId ? String(r.fromOwnerId) : null,
    fromOwnerName: r.fromOwnerName ? String(r.fromOwnerName) : null,
    toOwnerId: String(r.toOwnerId),
    toOwnerName: r.toOwnerName ? String(r.toOwnerName) : null,
    orderId: r.orderId ? String(r.orderId) : null,
    resaleListingId: r.resaleListingId ? String(r.resaleListingId) : null,
    createdAt: String(r.createdAt),
  }));
}
