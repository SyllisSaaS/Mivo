import { isDatabaseConfigured, query } from "./db";

/**
 * Lightweight admin audit trail.
 *
 * Never exposed publicly. Writes are best-effort: a logging failure must not
 * break the operation the admin was performing.
 */

export type AuditAction =
  | "admin.login"
  | "admin.login_failed"
  | "admin.logout"
  | "admin.sessions_revoked"
  | "enquiry.viewed"
  | "enquiry.status_changed"
  | "enquiry.note_added"
  | "enquiry.updated"
  | "enquiry.archived"
  | "enquiry.deleted"
  | "enquiry.exported"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "analytics.exported";

export interface AuditEntry {
  adminId?: number | null;
  action: AuditAction;
  targetType?: string | null;
  targetId?: string | number | null;
  detail?: string | null;
  ipHash?: string | null;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, detail, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.adminId ?? null,
        entry.action,
        entry.targetType ?? null,
        entry.targetId != null ? String(entry.targetId) : null,
        entry.detail ? entry.detail.slice(0, 500) : null,
        entry.ipHash ?? null,
      ]
    );
  } catch (error) {
    console.error("[audit] write failed", error);
  }
}

export interface AuditRow {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
}

export async function recentAudit(limit = 20): Promise<AuditRow[]> {
  if (!isDatabaseConfigured()) return [];
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return query<AuditRow>(
    `SELECT id, action, target_type, target_id, detail, created_at
       FROM audit_log
      ORDER BY created_at DESC
      LIMIT $1`,
    [safeLimit]
  );
}
