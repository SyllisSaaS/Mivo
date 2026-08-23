import { createHash } from "node:crypto";
import { env } from "./env";

/**
 * Request metadata helpers.
 *
 * Raw IP addresses are never stored. They are salted and hashed so that
 * rate limiting and session records work without retaining personal data.
 */

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function hashIp(ip: string): string {
  const salt = env.ipHashSalt ?? "mivo-development-fallback-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function ipHashFromHeaders(headers: Headers): string {
  return hashIp(clientIp(headers));
}

/** Short, non-reversible key for an email — used for per-account rate limits. */
export function emailKey(email: string): string {
  const salt = env.ipHashSalt ?? "mivo-development-fallback-salt";
  return createHash("sha256")
    .update(`${salt}:email:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

export function userAgent(headers: Headers): string {
  return (headers.get("user-agent") ?? "unknown").slice(0, 255);
}

/** Hostname of the referrer, or null. Used for anonymous analytics only. */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, 120);
  } catch {
    return null;
  }
}
