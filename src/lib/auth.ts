import { randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env, isAuthConfigured, isDatabaseConfigured } from "./env";
import { query, queryOne } from "./db";

/**
 * Owner-only authentication.
 *
 * Design notes
 * ------------
 * - There is no registration path. The single authorised account is
 *   provisioned from ADMIN_EMAIL / ADMIN_PASSWORD_HASH by scripts/db-setup.mjs.
 * - The session cookie is a signed JWT whose `jti` matches a row in
 *   `admin_sessions`. Both must be valid, so logout (which revokes the row)
 *   genuinely ends the session server-side.
 * - A fresh session id is minted on every login, preventing session fixation.
 * - Cookies are HttpOnly, SameSite=Lax and Secure in production. Combined with
 *   Next.js Server Actions (which verify request origin) this covers CSRF for
 *   state-changing requests without inventing a custom token scheme.
 */

export const SESSION_COOKIE = "mivo_session";
const SESSION_TTL_HOURS = 12;

export interface AdminSession {
  adminId: number;
  sessionId: string;
  email: string;
  expiresAt: Date;
}

interface AdminRow {
  id: number;
  email: string;
  password_hash: string;
}

function secretKey(): Uint8Array {
  const secret = env.authSecret;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still perform a comparison so timing does not leak length information.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export type CredentialResult =
  | { ok: true; adminId: number; email: string }
  | { ok: false; reason: "invalid" | "not_configured" };

/**
 * Verifies an email/password pair against the allowlisted owner account.
 *
 * Always performs a bcrypt comparison — even for an unknown email — so that
 * response timing cannot be used to discover whether an account exists.
 * The caller must surface a single generic error for every failure mode.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<CredentialResult> {
  if (!isAuthConfigured() || !isDatabaseConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const normalised = email.trim().toLowerCase();
  const allowlisted = env.adminEmail;

  let row: AdminRow | null = null;
  try {
    row = await queryOne<AdminRow>(
      `SELECT id, email, password_hash FROM admins WHERE email = $1`,
      [normalised]
    );
  } catch (error) {
    console.error("[auth] account lookup failed", error);
    return { ok: false, reason: "not_configured" };
  }

  // Dummy hash keeps the work factor comparable when no row was found.
  const hash = row?.password_hash ?? env.adminPasswordHash ?? "";
  const passwordMatches = hash
    ? await bcrypt.compare(password, hash)
    : false;

  const emailAllowed = allowlisted ? safeEquals(normalised, allowlisted) : false;

  if (!row || !emailAllowed || !passwordMatches) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, adminId: row.id, email: row.email };
}

/** Creates a new session row and sets the signed cookie. */
export async function createSession(
  adminId: number,
  meta: { ipHash?: string; userAgent?: string } = {}
): Promise<void> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO admin_sessions (id, admin_id, expires_at, ip_hash, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      sessionId,
      adminId,
      expiresAt.toISOString(),
      meta.ipHash ?? null,
      meta.userAgent ?? null,
    ]
  );

  await query(`UPDATE admins SET last_login_at = now() WHERE id = $1`, [adminId]);

  const token = await new SignJWT({ sub: String(adminId) })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/**
 * Returns the current session, or null.
 *
 * Verifies the cookie signature *and* that the session row is still live.
 * Called by every admin page, Server Action and protected route handler.
 */
export async function getSession(): Promise<AdminSession | null> {
  if (!isAuthConfigured() || !isDatabaseConfigured()) return null;

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let adminId: number;
  let sessionId: string;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.jti) return null;
    adminId = Number(payload.sub);
    sessionId = payload.jti;
    if (!Number.isInteger(adminId)) return null;
  } catch {
    return null;
  }

  try {
    const row = await queryOne<{ expires_at: string; email: string }>(
      `SELECT s.expires_at, a.email
         FROM admin_sessions s
         JOIN admins a ON a.id = s.admin_id
        WHERE s.id = $1
          AND s.admin_id = $2
          AND s.revoked_at IS NULL
          AND s.expires_at > now()`,
      [sessionId, adminId]
    );

    if (!row) return null;

    // Defence in depth: the account must still be the allowlisted owner.
    if (env.adminEmail && row.email.toLowerCase() !== env.adminEmail) {
      return null;
    }

    return {
      adminId,
      sessionId,
      email: row.email,
      expiresAt: new Date(row.expires_at),
    };
  } catch (error) {
    console.error("[auth] session lookup failed", error);
    return null;
  }
}

/** Server-side guard for admin pages. Redirects unauthenticated visitors. */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** Revokes the current session server-side and clears the cookie. */
export async function destroySession(): Promise<AdminSession | null> {
  const session = await getSession();

  if (session) {
    try {
      await query(
        `UPDATE admin_sessions SET revoked_at = now() WHERE id = $1`,
        [session.sessionId]
      );
    } catch (error) {
      console.error("[auth] session revocation failed", error);
    }
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return session;
}

/** Revokes every session for the owner — used by "sign out everywhere". */
export async function revokeAllSessions(adminId: number): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE admin_sessions
        SET revoked_at = now()
      WHERE admin_id = $1 AND revoked_at IS NULL AND expires_at > now()
      RETURNING id`,
    [adminId]
  );
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return rows.length;
}

export async function activeSessionCount(adminId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM admin_sessions
      WHERE admin_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [adminId]
  );
  return Number(rows[0]?.count ?? "0");
}

export { isAuthConfigured, isDatabaseConfigured };
