import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  DatabaseNotice,
  EmptyState,
  Panel,
  StatusBadge,
  relativeDays,
} from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import {
  BUDGET_RANGES,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  LEAD_SOURCES,
  PROJECT_TYPES,
} from "@/lib/constants";
import { isDatabaseConfigured } from "@/lib/db";
import { listEnquiries } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiries" };

const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["updated", "Recently updated"],
  ["name", "Name A–Z"],
  ["status", "Status"],
] as const;

const RANGE_OPTIONS = [
  ["", "Any time"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
] as const;

interface Params {
  q?: string;
  status?: string;
  type?: string;
  budget?: string;
  source?: string;
  days?: string;
  sort?: string;
  page?: string;
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireSession();
  const params = await searchParams;

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Enquiries" subtitle="Private lead pipeline" />
        <div className="admin-content">
          <div className="admin-panel">
            <DatabaseNotice />
          </div>
        </div>
      </>
    );
  }

  const days = params.days ? Number(params.days) : null;

  const result = await listEnquiries({
    search: params.q?.trim() || undefined,
    status: params.status || undefined,
    projectType: params.type || undefined,
    budget: params.budget || undefined,
    leadSource: params.source || undefined,
    days: Number.isFinite(days) && days ? days : null,
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
    perPage: 20,
  });

  const hasFilters = Boolean(
    params.q || params.status || params.type || params.budget || params.source || params.days
  );

  function pageHref(page: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") next.set(key, String(value));
    }
    next.set("page", String(page));
    return `/admin/enquiries?${next.toString()}`;
  }

  return (
    <>
      <AdminHeader
        title="Enquiries"
        subtitle={`${result.total} ${
          result.total === 1 ? "enquiry" : "enquiries"
        }${hasFilters ? " matching your filters" : ""}`}
        actions={
          <a
            className="admin-button admin-button--small"
            href="/api/admin/export/enquiries"
            download
          >
            Export CSV
          </a>
        }
      />

      <div className="admin-content">
        <Panel title="Search and filter">
          {/* A plain GET form: filter state lives in the URL, so it can be
              shared, bookmarked and restored without client-side state. */}
          <form className="admin-filters" method="get">
            <label className="admin-field">
              <span>Search</span>
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Name, email, business…"
              />
            </label>

            <label className="admin-field">
              <span>Status</span>
              <select name="status" defaultValue={params.status ?? ""}>
                <option value="">Active (not archived)</option>
                <option value="OPEN">Open pipeline</option>
                {ENQUIRY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ENQUIRY_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Project type</span>
              <select name="type" defaultValue={params.type ?? ""}>
                <option value="">Any</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Budget</span>
              <select name="budget" defaultValue={params.budget ?? ""}>
                <option value="">Any</option>
                {BUDGET_RANGES.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Lead source</span>
              <select name="source" defaultValue={params.source ?? ""}>
                <option value="">Any</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Received</span>
              <select name="days" defaultValue={params.days ?? ""}>
                {RANGE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Sort</span>
              <select name="sort" defaultValue={params.sort ?? "newest"}>
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="admin-button admin-button--primary">
                Apply
              </button>
              {hasFilters && (
                <Link className="admin-button" href="/admin/enquiries">
                  Clear
                </Link>
              )}
            </div>
          </form>
        </Panel>

        <Panel title="All enquiries" flush>
          {result.rows.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No matching enquiries" : "No enquiries yet"}
              description={
                hasFilters
                  ? "Try widening your filters or clearing them completely."
                  : "When someone submits the form on the public site it will appear here immediately."
              }
            >
              {hasFilters && (
                <Link className="admin-button" href="/admin/enquiries">
                  Clear filters
                </Link>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <caption>
                    Enquiries {result.page} of {result.totalPages} pages
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Project type</th>
                      <th scope="col">Budget</th>
                      <th scope="col">Source</th>
                      <th scope="col">Status</th>
                      <th scope="col">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td data-label="Name">
                          <Link
                            className="admin-table__main"
                            href={`/admin/enquiries/${enquiry.id}`}
                          >
                            {enquiry.name}
                          </Link>
                          <span className="admin-table__sub">
                            {enquiry.business_name ?? enquiry.email}
                          </span>
                        </td>
                        <td data-label="Project type">{enquiry.project_type}</td>
                        <td data-label="Budget">{enquiry.budget ?? "—"}</td>
                        <td data-label="Source">{enquiry.lead_source ?? "—"}</td>
                        <td data-label="Status">
                          <StatusBadge status={enquiry.status} />
                        </td>
                        <td data-label="Received">
                          {relativeDays(enquiry.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-pagination">
                <span>
                  Showing {(result.page - 1) * result.perPage + 1}–
                  {Math.min(result.page * result.perPage, result.total)} of{" "}
                  {result.total}
                </span>
                <span className="admin-pagination__links">
                  {result.page > 1 && (
                    <Link
                      className="admin-button admin-button--small"
                      href={pageHref(result.page - 1)}
                    >
                      Previous
                    </Link>
                  )}
                  {result.page < result.totalPages && (
                    <Link
                      className="admin-button admin-button--small"
                      href={pageHref(result.page + 1)}
                    >
                      Next
                    </Link>
                  )}
                </span>
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
