import { isDatabaseConfigured, query, queryOne } from "./db";
import {
  ENQUIRY_STATUSES,
  OPEN_ENQUIRY_STATUSES,
  type EnquiryStatus,
} from "./constants";
import type { EnquiryInput } from "./validation";

/**
 * Server-side data access for enquiries.
 *
 * Nothing here may be imported by a Client Component. Views request only
 * the columns they render, and lists are always paginated.
 */

export interface EnquiryRow {
  id: number;
  name: string;
  business_name: string | null;
  email: string;
  website: string | null;
  social: string | null;
  project_type: string;
  description: string;
  features: string | null;
  page_count: string | null;
  budget: string | null;
  deadline: string | null;
  branding: string | null;
  content_state: string | null;
  lead_source: string | null;
  status: EnquiryStatus;
  quoted_value: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export type EnquiryListRow = Pick<
  EnquiryRow,
  | "id"
  | "name"
  | "business_name"
  | "email"
  | "project_type"
  | "budget"
  | "status"
  | "lead_source"
  | "created_at"
>;

export interface EnquiryNote {
  id: number;
  body: string;
  created_at: string;
}

export async function createEnquiry(
  input: EnquiryInput,
  ipHash: string | null
): Promise<number | null> {
  if (!isDatabaseConfigured()) return null;

  const row = await queryOne<{ id: number }>(
    `INSERT INTO enquiries (
       name, business_name, email, website, social, project_type,
       description, features, page_count, budget, deadline,
       branding, content_state, lead_source, ip_hash
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      input.name,
      input.businessName ?? null,
      input.email,
      input.website ?? null,
      input.social ?? null,
      input.projectType,
      input.description,
      input.features ?? null,
      input.pageCount ?? null,
      input.budget ?? null,
      input.deadline ?? null,
      input.branding ?? null,
      input.contentState ?? null,
      input.leadSource ?? "Mivo website",
      ipHash,
    ]
  );

  return row?.id ?? null;
}

/**
 * Rejects a submission that duplicates one from the same email in the
 * last few minutes — protects against double-clicks and replayed requests.
 */
export async function isDuplicateEnquiry(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const row = await queryOne<{ exists: boolean }>(
    `SELECT true AS exists
       FROM enquiries
      WHERE email = $1 AND created_at > now() - interval '5 minutes'
      LIMIT 1`,
    [email]
  );
  return Boolean(row);
}

export interface EnquiryFilters {
  search?: string;
  status?: string;
  projectType?: string;
  budget?: string;
  leadSource?: string;
  days?: number | null;
  sort?: string;
  page?: number;
  perPage?: number;
}

const SORT_COLUMNS: Record<string, string> = {
  newest: "created_at DESC",
  oldest: "created_at ASC",
  updated: "updated_at DESC",
  name: "name ASC",
  status: "status ASC, created_at DESC",
};

export interface EnquiryListResult {
  rows: EnquiryListRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listEnquiries(
  filters: EnquiryFilters = {}
): Promise<EnquiryListResult> {
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 1, 1);

  if (!isDatabaseConfigured()) {
    return { rows: [], total: 0, page, perPage, totalPages: 0 };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`);
    const i = params.length;
    conditions.push(
      `(lower(name) LIKE $${i} OR lower(email) LIKE $${i}
        OR lower(coalesce(business_name, '')) LIKE $${i}
        OR lower(description) LIKE $${i})`
    );
  }

  if (filters.status && ENQUIRY_STATUSES.includes(filters.status as EnquiryStatus)) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  } else if (filters.status === "OPEN") {
    params.push(OPEN_ENQUIRY_STATUSES);
    conditions.push(`status = ANY($${params.length})`);
  } else if (!filters.status) {
    conditions.push(`status <> 'ARCHIVED'`);
  }

  if (filters.projectType) {
    params.push(filters.projectType);
    conditions.push(`project_type = $${params.length}`);
  }

  if (filters.budget) {
    params.push(filters.budget);
    conditions.push(`budget = $${params.length}`);
  }

  if (filters.leadSource) {
    params.push(filters.leadSource);
    conditions.push(`lead_source = $${params.length}`);
  }

  if (filters.days) {
    params.push(String(filters.days));
    conditions.push(`created_at > now() - ($${params.length} || ' days')::interval`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = SORT_COLUMNS[filters.sort ?? "newest"] ?? SORT_COLUMNS.newest;

  const countRow = await queryOne<{ total: string }>(
    `SELECT count(*)::text AS total FROM enquiries ${where}`,
    params
  );
  const total = Number(countRow?.total ?? "0");
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * perPage;

  const rows = await query<EnquiryListRow>(
    `SELECT id, name, business_name, email, project_type, budget,
            status, lead_source, created_at
       FROM enquiries
       ${where}
      ORDER BY ${orderBy}
      LIMIT ${perPage} OFFSET ${offset}`,
    params
  );

  return { rows, total, page: safePage, perPage, totalPages };
}

export async function getEnquiry(id: number): Promise<EnquiryRow | null> {
  if (!isDatabaseConfigured()) return null;
  return queryOne<EnquiryRow>(
    `SELECT id, name, business_name, email, website, social, project_type,
            description, features, page_count, budget, deadline, branding,
            content_state, lead_source, status, quoted_value,
            created_at, updated_at, responded_at
       FROM enquiries WHERE id = $1`,
    [id]
  );
}

export async function updateEnquiryStatus(
  id: number,
  status: EnquiryStatus
): Promise<void> {
  // `status` is validated by the caller against ENQUIRY_STATUSES, and the
  // database additionally enforces a CHECK constraint.
  await query(
    `UPDATE enquiries
        SET status = $2,
            updated_at = now(),
            responded_at = CASE
              WHEN responded_at IS NULL AND $2 <> 'NEW' THEN now()
              ELSE responded_at
            END
      WHERE id = $1`,
    [id, status]
  );
}

export async function updateQuotedValue(
  id: number,
  value: number | null
): Promise<void> {
  await query(
    `UPDATE enquiries SET quoted_value = $2, updated_at = now() WHERE id = $1`,
    [id, value]
  );
}

export async function deleteEnquiry(id: number): Promise<void> {
  await query(`DELETE FROM enquiries WHERE id = $1`, [id]);
}

export async function listNotes(enquiryId: number): Promise<EnquiryNote[]> {
  if (!isDatabaseConfigured()) return [];
  return query<EnquiryNote>(
    `SELECT id, body, created_at
       FROM enquiry_notes
      WHERE enquiry_id = $1
      ORDER BY created_at DESC`,
    [enquiryId]
  );
}

export async function addNote(enquiryId: number, body: string): Promise<void> {
  await query(
    `INSERT INTO enquiry_notes (enquiry_id, body) VALUES ($1, $2)`,
    [enquiryId, body]
  );
  await query(`UPDATE enquiries SET updated_at = now() WHERE id = $1`, [
    enquiryId,
  ]);
}

export async function deleteNote(noteId: number): Promise<void> {
  await query(`DELETE FROM enquiry_notes WHERE id = $1`, [noteId]);
}

/** Full rows for CSV export. Admin-only. */
export async function exportEnquiries(): Promise<EnquiryRow[]> {
  if (!isDatabaseConfigured()) return [];
  return query<EnquiryRow>(
    `SELECT id, name, business_name, email, website, social, project_type,
            description, features, page_count, budget, deadline, branding,
            content_state, lead_source, status, quoted_value,
            created_at, updated_at, responded_at
       FROM enquiries
      ORDER BY created_at DESC`
  );
}
