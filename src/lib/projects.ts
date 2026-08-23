import { isDatabaseConfigured, query, queryOne } from "./db";
import {
  ACTIVE_PROJECT_STATUSES,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "./constants";

export interface ProjectRow {
  id: number;
  name: string;
  client_name: string | null;
  enquiry_id: number | null;
  status: ProjectStatus;
  start_date: string | null;
  deadline: string | null;
  value: string | null;
  deposit_paid: boolean;
  final_paid: boolean;
  repo_url: string | null;
  live_url: string | null;
  domain: string | null;
  hosting: string | null;
  maintenance: boolean;
  folder_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  clientName?: string | null;
  enquiryId?: number | null;
  status: ProjectStatus;
  startDate?: string | null;
  deadline?: string | null;
  value?: number | null;
  depositPaid: boolean;
  finalPaid: boolean;
  repoUrl?: string | null;
  liveUrl?: string | null;
  domain?: string | null;
  hosting?: string | null;
  maintenance: boolean;
  folderRef?: string | null;
  notes?: string | null;
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && PROJECT_STATUSES.includes(value as ProjectStatus);
}

export async function listProjects(status?: string): Promise<ProjectRow[]> {
  if (!isDatabaseConfigured()) return [];

  if (status && isProjectStatus(status)) {
    return query<ProjectRow>(
      `SELECT * FROM projects WHERE status = $1
        ORDER BY coalesce(deadline, '9999-12-31'::date) ASC, created_at DESC`,
      [status]
    );
  }

  if (status === "ACTIVE") {
    return query<ProjectRow>(
      `SELECT * FROM projects WHERE status = ANY($1)
        ORDER BY coalesce(deadline, '9999-12-31'::date) ASC, created_at DESC`,
      [ACTIVE_PROJECT_STATUSES]
    );
  }

  return query<ProjectRow>(
    `SELECT * FROM projects
      ORDER BY coalesce(deadline, '9999-12-31'::date) ASC, created_at DESC`
  );
}

export async function getProject(id: number): Promise<ProjectRow | null> {
  if (!isDatabaseConfigured()) return null;
  return queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [id]);
}

export async function createProject(input: ProjectInput): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO projects (
       name, client_name, enquiry_id, status, start_date, deadline, value,
       deposit_paid, final_paid, repo_url, live_url, domain, hosting,
       maintenance, folder_ref, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      input.name,
      input.clientName ?? null,
      input.enquiryId ?? null,
      input.status,
      input.startDate ?? null,
      input.deadline ?? null,
      input.value ?? null,
      input.depositPaid,
      input.finalPaid,
      input.repoUrl ?? null,
      input.liveUrl ?? null,
      input.domain ?? null,
      input.hosting ?? null,
      input.maintenance,
      input.folderRef ?? null,
      input.notes ?? null,
    ]
  );
  return row?.id ?? null;
}

export async function updateProject(
  id: number,
  input: ProjectInput
): Promise<void> {
  await query(
    `UPDATE projects SET
       name = $2, client_name = $3, enquiry_id = $4, status = $5,
       start_date = $6, deadline = $7, value = $8, deposit_paid = $9,
       final_paid = $10, repo_url = $11, live_url = $12, domain = $13,
       hosting = $14, maintenance = $15, folder_ref = $16, notes = $17,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      input.name,
      input.clientName ?? null,
      input.enquiryId ?? null,
      input.status,
      input.startDate ?? null,
      input.deadline ?? null,
      input.value ?? null,
      input.depositPaid,
      input.finalPaid,
      input.repoUrl ?? null,
      input.liveUrl ?? null,
      input.domain ?? null,
      input.hosting ?? null,
      input.maintenance,
      input.folderRef ?? null,
      input.notes ?? null,
    ]
  );
}

export async function deleteProject(id: number): Promise<void> {
  await query(`DELETE FROM projects WHERE id = $1`, [id]);
}
