import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { recordAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { exportEnquiries } from "@/lib/enquiries";
import { getAnalyticsBreakdown } from "@/lib/metrics";
import { ipHashFromHeaders } from "@/lib/request";

/**
 * Private CSV exports.
 *
 * The Edge proxy rejects requests with no session cookie, but this handler
 * still verifies the session against the database itself — a route handler
 * must never rely on an upstream check alone.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const body = rows
    .map((row) => columns.map((column) => csvCell(row[column])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { kind } = await params;
  const ipHash = ipHashFromHeaders(await headers());
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    if (kind === "enquiries") {
      const rows = await exportEnquiries();
      await recordAudit({
        adminId: session.adminId,
        action: "enquiry.exported",
        detail: `${rows.length} rows`,
        ipHash,
      });

      return csvResponse(
        toCsv(rows as unknown as Record<string, unknown>[], [
          "id",
          "created_at",
          "status",
          "name",
          "business_name",
          "email",
          "website",
          "social",
          "project_type",
          "page_count",
          "budget",
          "deadline",
          "branding",
          "content_state",
          "lead_source",
          "quoted_value",
          "responded_at",
          "updated_at",
          "description",
          "features",
        ]),
        `mivo-enquiries-${stamp}.csv`
      );
    }

    if (kind === "analytics") {
      const data = await getAnalyticsBreakdown(null);
      const rows: Record<string, unknown>[] = [
        ...data.byWeek.map((r) => ({
          metric: "enquiries_by_week",
          label: r.period,
          value: r.count,
        })),
        ...data.byProjectType.map((r) => ({
          metric: "enquiries_by_project_type",
          label: r.label,
          value: r.count,
        })),
        ...data.byBudget.map((r) => ({
          metric: "enquiries_by_budget",
          label: r.label,
          value: r.count,
        })),
        ...data.byLeadSource.map((r) => ({
          metric: "enquiries_by_lead_source",
          label: r.label,
          value: r.count,
        })),
        ...data.byStatus.map((r) => ({
          metric: "enquiries_by_status",
          label: r.label,
          value: r.count,
        })),
        ...data.eventCounts.map((r) => ({
          metric: "site_events",
          label: r.name,
          value: r.count,
        })),
      ];

      await recordAudit({
        adminId: session.adminId,
        action: "analytics.exported",
        detail: `${rows.length} rows`,
        ipHash,
      });

      return csvResponse(
        toCsv(rows, ["metric", "label", "value"]),
        `mivo-analytics-${stamp}.csv`
      );
    }

    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  } catch (error) {
    // Log the detail; return nothing useful to the client.
    console.error("[export] failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
