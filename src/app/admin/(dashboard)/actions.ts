"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import {
  destroySession,
  requireSession,
  revokeAllSessions,
} from "@/lib/auth";
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
