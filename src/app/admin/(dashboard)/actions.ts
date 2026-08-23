"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import {
  destroySession,
  requireSession,
  revokeAllSessions,
} from "@/lib/auth";
import { DEMO_COOKIE } from "@/lib/demo";
import { ipHashFromHeaders } from "@/lib/request";

/** Ends this session server-side, then clears the cookie. */
export async function signOut(): Promise<void> {
  const ipHash = ipHashFromHeaders(await headers());
  const session = await destroySession();

  if (session) {
    await recordAudit({
      adminId: session.adminId,
      action: "admin.logout",
      ipHash,
    });
  }

  redirect("/admin/login");
}

/** Revokes every active session — use if a device is lost. */
export async function signOutEverywhere(): Promise<void> {
  const session = await requireSession();
  const ipHash = ipHashFromHeaders(await headers());
  const count = await revokeAllSessions(session.adminId);

  await recordAudit({
    adminId: session.adminId,
    action: "admin.sessions_revoked",
    detail: `${count} session(s) revoked`,
    ipHash,
  });

  redirect("/admin/login");
}

/** Toggles sample dashboard data for screenshots and practice. Admin-only. */
export async function toggleDemoMode(): Promise<void> {
  const session = await requireSession();
  const jar = await cookies();
  const enabled = jar.get(DEMO_COOKIE)?.value === "1";

  if (enabled) {
    jar.delete(DEMO_COOKIE);
  } else {
    jar.set(DEMO_COOKIE, "1", {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  await recordAudit({
    adminId: session.adminId,
    action: enabled ? "admin.demo_off" : "admin.demo_on",
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin", "layout");
}
