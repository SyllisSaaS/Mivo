"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/constants";
import {
  addNote,
  deleteEnquiry,
  deleteNote,
  updateEnquiryStatus,
  updateQuotedValue,
} from "@/lib/enquiries";
import { ipHashFromHeaders } from "@/lib/request";
import { clampNote } from "@/lib/validation";

/**
 * Enquiry mutations.
 *
 * Every action independently calls `requireSession()`. A Server Action is a
 * real HTTP endpoint, so it must authorise itself rather than trusting that
 * the page which rendered the form was protected.
 */

function parseId(value: FormDataEntryValue | null): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid identifier");
  }
  return id;
}

function parseStatus(value: FormDataEntryValue | null): EnquiryStatus {
  const status = String(value ?? "");
  if (!ENQUIRY_STATUSES.includes(status as EnquiryStatus)) {
    throw new Error("Invalid status");
  }
  return status as EnquiryStatus;
}

export async function setEnquiryStatus(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = parseId(formData.get("id"));
  const status = parseStatus(formData.get("status"));

  await updateEnquiryStatus(id, status);
  await recordAudit({
    adminId: session.adminId,
    action: "enquiry.status_changed",
    targetType: "enquiry",
    targetId: id,
    detail: status,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function setQuotedValue(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = parseId(formData.get("id"));

  const raw = String(formData.get("quotedValue") ?? "").trim();
  let value: number | null = null;

  if (raw !== "") {
    const parsed = Number(raw.replace(/[£,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99_999_999) {
      throw new Error("Invalid value");
    }
    value = Math.round(parsed * 100) / 100;
  }

  await updateQuotedValue(id, value);
  await recordAudit({
    adminId: session.adminId,
    action: "enquiry.updated",
    targetType: "enquiry",
    targetId: id,
    detail: value === null ? "quote cleared" : `quote set to ${value}`,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath(`/admin/enquiries/${id}`);
}

export async function addEnquiryNote(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = parseId(formData.get("id"));
  const body = clampNote(formData.get("body"));

  if (!body) return;

  await addNote(id, body);
  await recordAudit({
    adminId: session.adminId,
    action: "enquiry.note_added",
    targetType: "enquiry",
    targetId: id,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath(`/admin/enquiries/${id}`);
}

export async function removeEnquiryNote(formData: FormData): Promise<void> {
  await requireSession();
  const noteId = parseId(formData.get("noteId"));
  const enquiryId = parseId(formData.get("id"));

  await deleteNote(noteId);
  revalidatePath(`/admin/enquiries/${enquiryId}`);
}

export async function archiveEnquiry(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = parseId(formData.get("id"));

  await updateEnquiryStatus(id, "ARCHIVED");
  await recordAudit({
    adminId: session.adminId,
    action: "enquiry.archived",
    targetType: "enquiry",
    targetId: id,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin/enquiries");
  redirect("/admin/enquiries");
}

/**
 * Permanent deletion. Archiving is the recommended path — this exists for
 * spam and genuine mistakes, and is confirmed in the UI before it runs.
 */
export async function removeEnquiry(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = parseId(formData.get("id"));

  await deleteEnquiry(id);
  await recordAudit({
    adminId: session.adminId,
    action: "enquiry.deleted",
    targetType: "enquiry",
    targetId: id,
    ipHash: ipHashFromHeaders(await headers()),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  redirect("/admin/enquiries");
}
