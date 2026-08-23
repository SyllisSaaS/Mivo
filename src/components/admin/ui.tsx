import Link from "next/link";
import type { ReactNode } from "react";
import {
  ENQUIRY_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type EnquiryStatus,
  type ProjectStatus,
} from "@/lib/constants";

/**
 * Shared presentational pieces for the admin dashboard.
 *
 * All Server Components — no client JavaScript is shipped for these.
 */

/* ---------- StatCard ---------- */

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string | null;
  hint?: string;
  accent?: boolean;
}) {
  // A null value means "we genuinely do not have this data" — say so rather
  // than displaying a misleading zero.
  const hasValue = value !== null && value !== "";

  return (
    <div className={`admin-stat${accent ? " admin-stat--accent" : ""}`}>
      <span className="admin-stat__label">{label}</span>
      <span
        className={`admin-stat__value${
          hasValue ? "" : " admin-stat__value--muted"
        }`}
      >
        {hasValue ? value : "No data yet"}
      </span>
      {hint && <span className="admin-stat__hint">{hint}</span>}
    </div>
  );
}

/* ---------- Panel ---------- */

export function Panel({
  title,
  description,
  action,
  children,
  flush,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className={`admin-panel__body${flush ? " admin-panel__body--flush" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/* ---------- StatusBadge ---------- */

const ENQUIRY_TONE: Record<EnquiryStatus, string> = {
  NEW: "new",
  REVIEWING: "progress",
  QUOTED: "progress",
  NEGOTIATING: "progress",
  WON: "positive",
  IN_PROGRESS: "progress",
  COMPLETED: "positive",
  LOST: "negative",
  ARCHIVED: "neutral",
};

const PROJECT_TONE: Record<ProjectStatus, string> = {
  LEAD: "new",
  QUOTED: "progress",
  ACCEPTED: "progress",
  IN_PROGRESS: "progress",
  CLIENT_REVIEW: "progress",
  READY_TO_LAUNCH: "progress",
  COMPLETED: "positive",
  MAINTENANCE: "positive",
  CANCELLED: "negative",
};

export function StatusBadge({
  status,
  kind = "enquiry",
}: {
  status: string;
  kind?: "enquiry" | "project";
}) {
  const tone =
    kind === "enquiry"
      ? (ENQUIRY_TONE[status as EnquiryStatus] ?? "neutral")
      : (PROJECT_TONE[status as ProjectStatus] ?? "neutral");

  const label =
    kind === "enquiry"
      ? (ENQUIRY_STATUS_LABELS[status as EnquiryStatus] ?? status)
      : (PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status);

  return <span className={`admin-badge admin-badge--${tone}`}>{label}</span>;
}

/* ---------- EmptyState ---------- */

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children && <div className="admin-empty__actions">{children}</div>}
    </div>
  );
}

/* ---------- Notice ---------- */

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
}) {
  const cls = tone === "info" ? "" : ` admin-notice--${tone}`;
  return (
    <p className={`admin-notice${cls}`} role={tone === "error" ? "alert" : undefined}>
      {children}
    </p>
  );
}

/* ---------- DatabaseNotice ---------- */

export function DatabaseNotice() {
  return (
    <EmptyState
      title="Database not configured"
      description="Set DATABASE_URL and run the schema to start storing enquiries, projects and analytics. Until then the public site still works and enquiries are delivered by email if RESEND_API_KEY is set."
    >
      <Link className="admin-button" href="/admin/settings">
        View configuration
      </Link>
    </EmptyState>
  );
}

/* ---------- Range picker ---------- */

export function RangePicker({
  basePath,
  current,
  extraParams = {},
}: {
  basePath: string;
  current: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const ranges = [
    ["today", "Today"],
    ["7d", "7 days"],
    ["30d", "30 days"],
    ["90d", "90 days"],
    ["all", "All time"],
  ] as const;

  return (
    <div className="admin-range" role="group" aria-label="Date range">
      {ranges.map(([key, label]) => {
        const params = new URLSearchParams();
        for (const [name, value] of Object.entries(extraParams)) {
          if (value) params.set(name, value);
        }
        params.set("range", key);
        return (
          <Link
            key={key}
            href={`${basePath}?${params.toString()}`}
            aria-current={current === key ? "true" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- Accessible bar chart ---------- */

export function BarChart({
  data,
  caption,
  emptyLabel = "No data yet",
}: {
  data: { label: string; count: number }[];
  caption?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="admin-stat__hint">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="admin-bars">
      {caption && (
        <p className="visually-hidden">
          {caption}. Total {total}.
        </p>
      )}
      {data.map((item) => (
        <div className="admin-bar" key={item.label}>
          <span className="admin-bar__label" title={item.label}>
            {item.label}
          </span>
          <span className="admin-bar__track" aria-hidden="true">
            <span
              className="admin-bar__fill"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="admin-bar__value">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Weekly trend. Rendered as bars for scanning plus a real table for screen
 * readers and keyboard users, so the chart is never the only way to read it.
 */
export function TrendChart({
  data,
}: {
  data: { period: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="admin-stat__hint">
        No enquiries recorded in this period yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <>
      <div className="admin-sparkline" aria-hidden="true">
        {data.map((item) => (
          <span
            key={item.period}
            className="admin-sparkline__bar"
            style={{ height: `${Math.max((item.count / max) * 100, 3)}%` }}
            title={`${item.period}: ${item.count}`}
          />
        ))}
      </div>
      <details>
        <summary className="admin-stat__hint">View as table</summary>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption>Enquiries by week (week commencing)</caption>
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.period}>
                  <td data-label="Week">{item.period}</td>
                  <td data-label="Enquiries" className="admin-table__num">
                    {item.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

/* ---------- Formatting helpers ---------- */

export function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function relativeDays(value: string): string {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}
