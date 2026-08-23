"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { createSession, getSession, verifyCredentials } from "@/lib/auth";
import { LIMITS, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { emailKey, ipHashFromHeaders, userAgent } from "@/lib/request";

/**
 * Login.
 *
 * Server Action, so Next.js verifies the request origin — that covers CSRF
 * without a hand-rolled token.
 *
 * Every failure returns the SAME generic message. Nothing distinguishes
 * "no such account" from "wrong password" from "not the allowlisted owner",
 * so the form cannot be used to discover whether an address exists.
 */

const GENERIC_FAILURE = "Those details did not match. Please try again.";
const RATE_LIMITED =
  "Too many attempts. Please wait a few minutes before trying again.";
const NOT_CONFIGURED =
  "Admin sign-in is not available yet. Check the server configuration.";

export interface LoginState {
  error?: string;
}

/** Only allow relative in-app paths, so `next` cannot become an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("..")) return "/admin";
  return value;
}

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headerList = await headers();
  const ipHash = ipHashFromHeaders(headerList);

  const email = String(formData.get("email") ?? "").slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const next = safeNext(formData.get("next"));

  // Per-IP limit stops distributed guessing against one address.
  const ipLimit = await rateLimit(
    `login:${ipHash}`,
    LIMITS.login.limit,
    LIMITS.login.windowSeconds
  );
  if (!ipLimit.allowed) {
    await recordAudit({
      action: "admin.login_failed",
      detail: "rate limited by ip",
      ipHash,
    });
    return { error: RATE_LIMITED };
  }

  // Per-account limit stops slow guessing from many addresses.
  if (email) {
    const accountLimit = await rateLimit(
      `login_account:${emailKey(email)}`,
      LIMITS.loginPerAccount.limit,
      LIMITS.loginPerAccount.windowSeconds
    );
    if (!accountLimit.allowed) {
      await recordAudit({
        action: "admin.login_failed",
        detail: "rate limited by account",
        ipHash,
      });
      return { error: RATE_LIMITED };
    }
  }

  if (!email || !password) {
    return { error: GENERIC_FAILURE };
  }

  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      console.error(
        "[auth] sign-in attempted while DATABASE_URL / AUTH_SECRET / ADMIN_* are incomplete"
      );
      return { error: NOT_CONFIGURED };
    }
    await recordAudit({
      action: "admin.login_failed",
      detail: "invalid credentials",
      ipHash,
    });
    return { error: GENERIC_FAILURE };
  }

  // A brand-new session id is minted here, so a pre-existing cookie value can
  // never be promoted to an authenticated one (session fixation).
  await createSession(result.adminId, {
    ipHash,
    userAgent: userAgent(headerList),
  });

  await resetRateLimit(`login:${ipHash}`);
  await recordAudit({
    adminId: result.adminId,
    action: "admin.login",
    ipHash,
  });

  redirect(next);
}

/** Redirects an already-authenticated visitor away from the login page. */
export async function redirectIfSignedIn(): Promise<void> {
  const session = await getSession();
  if (session) {
    redirect("/admin");
  }
}
