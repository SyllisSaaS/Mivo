import { NextResponse } from "next/server";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/constants";
import { isDatabaseConfigured, query } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { ipHashFromHeaders, referrerHost } from "@/lib/request";

/**
 * Anonymous analytics collection.
 *
 * Stores only an allowlisted event name, a short path and the referrer
 * hostname. No cookies, no identifiers, no IP addresses — so the rows cannot
 * be tied back to an individual. The IP is used transiently for rate limiting
 * and is salted-hashed, never persisted here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEventName(value: unknown): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    ANALYTICS_EVENTS.includes(value as AnalyticsEventName)
  );
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return new NextResponse(null, { status: 204 });
  }

  const ipHash = ipHashFromHeaders(request.headers);
  const limit = await rateLimit(
    `analytics:${ipHash}`,
    LIMITS.analytics.limit,
    LIMITS.analytics.windowSeconds
  );
  if (!limit.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  if (!isEventName(body.name)) {
    return new NextResponse(null, { status: 400 });
  }

  const path =
    typeof body.path === "string" ? body.path.slice(0, 200) : null;

  try {
    await query(
      `INSERT INTO analytics_events (name, path, referrer_host)
       VALUES ($1, $2, $3)`,
      [body.name, path, referrerHost(request.headers.get("referer"))]
    );
  } catch (error) {
    console.error("[analytics] insert failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
