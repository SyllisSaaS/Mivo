import { isDatabaseConfigured, query } from "./db";
import { env } from "./env";

/**
 * Sliding-window rate limiting backed by Postgres.
 *
 * Postgres is used rather than in-process memory because the app runs on
 * serverless infrastructure where each request may hit a different
 * instance — an in-memory counter would provide no real protection.
 *
 * The in-memory path below exists only as a local-development fallback
 * when DATABASE_URL is unset, and is never relied on in production.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const memoryBuckets = new Map<string, number[]>();

function memoryLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;
  const hits = (memoryBuckets.get(bucket) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + windowSeconds * 1000 - now) / 1000)
      ),
    };
  }

  hits.push(now);
  memoryBuckets.set(bucket, hits);
  return {
    allowed: true,
    remaining: limit - hits.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Consumes one unit from `bucket`. Returns whether the request may proceed.
 *
 * Fails open (allows the request) if the datastore errors, so a database
 * hiccup cannot lock legitimate visitors out of the enquiry form. Login is
 * additionally protected by password verification.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isDatabaseConfigured()) {
    if (env.isProduction) {
      // No shared store in production means no meaningful limit; say so
      // loudly in the logs rather than pretending to be protected.
      console.warn(
        "[rate-limit] DATABASE_URL unset in production — rate limiting is not enforced"
      );
    }
    return memoryLimit(bucket, limit, windowSeconds);
  }

  try {
    const rows = await query<{ hits: string }>(
      `SELECT count(*)::text AS hits
         FROM rate_limit_hits
        WHERE bucket = $1
          AND created_at > now() - ($2 || ' seconds')::interval`,
      [bucket, String(windowSeconds)]
    );

    const hits = Number(rows[0]?.hits ?? "0");

    if (hits >= limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
    }

    await query(`INSERT INTO rate_limit_hits (bucket) VALUES ($1)`, [bucket]);

    // Opportunistic cleanup keeps the table small without a cron job.
    if (Math.random() < 0.02) {
      await query(
        `DELETE FROM rate_limit_hits WHERE created_at < now() - interval '1 day'`
      );
    }

    return {
      allowed: true,
      remaining: limit - hits - 1,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    console.error("[rate-limit] store unavailable", error);
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  }
}

/** Clears a bucket, e.g. after a successful login. */
export async function resetRateLimit(bucket: string): Promise<void> {
  memoryBuckets.delete(bucket);
  if (!isDatabaseConfigured()) return;
  try {
    await query(`DELETE FROM rate_limit_hits WHERE bucket = $1`, [bucket]);
  } catch (error) {
    console.error("[rate-limit] reset failed", error);
  }
}

export const LIMITS = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  loginPerAccount: { limit: 10, windowSeconds: 60 * 60 },
  enquiry: { limit: 5, windowSeconds: 60 * 60 },
  analytics: { limit: 120, windowSeconds: 60 },
} as const;
