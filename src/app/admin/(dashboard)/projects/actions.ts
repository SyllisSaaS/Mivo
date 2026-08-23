"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import {
  createProject,
  deleteProject,
  isProjectStatus,
  updateProject,
  type ProjectInput,
} from "@/lib/projects";
import { ipHashFromHeaders } from "@/lib/request";

/**
 * Project mutations. Each one authorises independently via `requireSession()`.
 *
 * Note: project notes are free text and are stored as-is. Credentials, API
 * keys and access tokens must never be pasted here — see docs/admin/security.md.
 */

function text(
  formData: FormData,
  field: string,
  max = 300
): string | null {
  const value = String(formData.get(field) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

function money(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[£,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99_999_999) return null;
  return Math.round(parsed * 100) / 100;
}

function date(formData: FormData, field: string): string | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function url(formData: FormData, field: string): string | null {
  const raw = text(formData, field);
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function readInput(formData: FormData): ProjectInput {
  const name = text(formData, "name", 200);
  if (!name) {
    throw new Error("Project name is required");
  }

  const status = String(formData.get("status") ?? "LEAD");
  if (!isProjectStatus(status)) {
    throw new Error("Invalid status");
  }

  const enquiryRaw = String(formData.get("enquiryId") ?? "").trim();
  const enquiryId = enquiryRaw ? Number(enquiryRaw) : null;

  return {
    name,
    clientName: text(formData, "clientName", 200),
    enquiryId:
      enquiryId && Number.isInteger(enquiryId) && enquiryId > 0 ? enquiryId : null,
    status,
    startDate: date(formData, "startDate"),
    deadline: date(formData, "deadline"),
    value: money(formData, "value"),
    depositPaid: formData.get("depositPaid") === "on",
    finalPaid: formData.get("finalPaid") === "on",
    repoUrl: url(formData, "repoUrl"),
    liveUrl: url(formData, "liveUrl"),
    domain: text(formData, "domain", 200),
    hosting: text(formData, "hosting", 200),
    maintenance: formData.get("maintenance") === "on",
    folderRef: text(formData, "folderRef", 200),
    notes: text(formData, "notes", 4000),
  };
}

export async function addProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const input = readInput(formData);
  const id = await createProject(input);

  await recordAudit({
    adminId: session.adminId,
    action: "project.created",
    targetType: "project",
    targetId: id,
    detail: input.name,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

export async function editProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid identifier");
  }

  const input = readInput(formData);
  await updateProject(id, input);

  await recordAudit({
    adminId: session.adminId,
    action: "project.updated",
    targetType: "project",
    targetId: id,
    detail: input.name,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

export async function removeProject(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid identifier");
  }

  await deleteProject(id);
  await recordAudit({
    adminId: session.adminId,
    action: "project.deleted",
    targetType: "project",
    targetId: id,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}
