#!/usr/bin/env node
/**
 * Applies db/schema.sql and provisions the single owner account.
 *
 *   npm run db:setup
 *
 * Requires DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD_HASH in the
 * environment (a .env.local file is read automatically). Safe to re-run:
 * the schema is idempotent and the owner row is upserted, which is also how
 * you rotate the password.
 */

import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

async function loadEnvFile(path) {
  try {
    const text = await readFile(path, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // No local env file — rely on the real environment.
  }
}

await loadEnvFile(new URL("../.env.local", import.meta.url));

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD_HASH } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local and retry.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log("Applying schema…");

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

// The HTTP driver sends one statement per request, so split on statement
// boundaries after stripping comments.
const statements = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Schema applied (${statements.length} statements).`);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
  console.log(
    "\nADMIN_EMAIL / ADMIN_PASSWORD_HASH not set — schema is ready but no owner\n" +
      "account was created. Run `npm run admin:hash`, set both variables, then\n" +
      "re-run this script."
  );
  process.exit(0);
}

if (!ADMIN_PASSWORD_HASH.startsWith("$2")) {
  console.error(
    "\nADMIN_PASSWORD_HASH does not look like a bcrypt hash. Did you paste the\n" +
      "plaintext password by mistake? Run `npm run admin:hash` to generate one."
  );
  process.exit(1);
}

const email = ADMIN_EMAIL.trim().toLowerCase();

const existing = await sql.query(
  `SELECT id FROM admins WHERE email <> $1`,
  [email]
);

if (existing.length > 0) {
  console.log(
    `\nNote: ${existing.length} other account row(s) exist. Only ${email} can\n` +
      "sign in, because the email is also checked against ADMIN_EMAIL at login."
  );
}

await sql.query(
  `INSERT INTO admins (email, password_hash)
   VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [email, ADMIN_PASSWORD_HASH]
);

// Rotating the password invalidates existing sessions.
const revoked = await sql.query(
  `UPDATE admin_sessions SET revoked_at = now()
    WHERE revoked_at IS NULL AND expires_at > now()
    RETURNING id`
);

console.log(`\nOwner account ready: ${email}`);
if (revoked.length > 0) {
  console.log(`${revoked.length} existing session(s) revoked.`);
}
console.log("\nSign in at /admin/login");
