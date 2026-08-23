import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { env, isDatabaseConfigured } from "./env";

/**
 * Server-side database access.
 *
 * Every query is parameterised — never interpolate user input into SQL.
 * Column names used for sorting are validated against an allowlist by
 * the calling module.
 */

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  const url = env.databaseUrl;
  if (!url) {
    throw new DatabaseNotConfiguredError();
  }
  if (!client) {
    client = neon(url);
  }
  return client;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

/** Runs a parameterised query and returns typed rows. */
export async function query<T>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getClient();
  const rows = await sql.query(text, params);
  return rows as T[];
}

/** Runs a query expected to return at most one row. */
export async function queryOne<T>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export { isDatabaseConfigured };
