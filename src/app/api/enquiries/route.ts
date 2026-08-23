import { NextResponse } from "next/server";
import { createEnquiry, isDuplicateEnquiry } from "@/lib/enquiries";
import { sendEnquiryNotification } from "@/lib/email";
import { env, isDatabaseConfigured } from "@/lib/env";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { ipHashFromHeaders } from "@/lib/request";
import { looksAutomated, validateEnquiry } from "@/lib/validation";

/**
 * Public enquiry endpoint — the only write the public site can perform.
 *
 * It can CREATE an enquiry and nothing else. There is deliberately no GET,
 * PATCH or DELETE handler here: reading and modifying enquiries happens only
 * through authenticated admin pages and Server Actions.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR =
  "Something went wrong sending your enquiry. Please try again shortly, or email me directly.";

export async function POST(request: Request) {
  const ipHash = ipHashFromHeaders(request.headers);

  const limit = await rateLimit(
    `enquiry:${ipHash}`,
    LIMITS.enquiry.limit,
    LIMITS.enquiry.windowSeconds
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "You have sent several enquiries recently. Please email me directly instead.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const body = payload as Record<string, unknown>;

  // Silently accept obvious bot submissions so they get no useful feedback.
  if (looksAutomated({ honeypot: body.honeypot, elapsedMs: body.elapsedMs })) {
    return NextResponse.json({ ok: true });
  }

  const result = validateEnquiry(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 422 }
    );
  }

  const enquiry = result.value;

  try {
    if (await isDuplicateEnquiry(enquiry.email)) {
      // Treat a repeat submission as success — the first one was stored.
      return NextResponse.json({ ok: true });
    }

    let enquiryId: number | null = null;
    if (isDatabaseConfigured()) {
      enquiryId = await createEnquiry(enquiry, ipHash);
    }

    const emailed = await sendEnquiryNotification(enquiry, enquiryId);

    // The submission only counts as delivered if it was stored or emailed.
    if (enquiryId === null && !emailed) {
      if (env.isProduction) {
        console.error(
          "[enquiries] no delivery sink configured — set DATABASE_URL and/or RESEND_API_KEY"
        );
        return NextResponse.json(
          { ok: false, message: GENERIC_ERROR },
          { status: 503 }
        );
      }
      // Local development without a database or mail provider.
      console.info("[enquiries] dev mode — enquiry received", {
        projectType: enquiry.projectType,
        hasEmail: Boolean(enquiry.email),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log detail server-side; never return it to the visitor.
    console.error("[enquiries] submission failed", error);
    return NextResponse.json(
      { ok: false, message: GENERIC_ERROR },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Enquiry data is private. Reading happens only in the authenticated admin.
  return NextResponse.json({ ok: false }, { status: 405 });
}
