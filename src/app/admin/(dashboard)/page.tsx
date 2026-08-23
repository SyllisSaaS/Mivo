import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  BarChart,
  DatabaseNotice,
  EmptyState,
  Panel,
  RangePicker,
  StatCard,
  StatusBadge,
  formatCurrency,
  formatDate,
  relativeDays,
} from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import {
  DATE_RANGES,
  ENQUIRY_STATUS_LABELS,
  isDateRangeKey,
  type EnquiryStatus,
} from "@/lib/constants";
import { isDatabaseConfigured } from "@/lib/db";
import {
  demoEnquiriesList,
  demoOverviewMetrics,
  isDemoMode,
} from "@/lib/demo";
import { listEnquiries } from "@/lib/enquiries";
import { getOverviewMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview" };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireSession();

  const params = await searchParams;
  const rangeKey = isDateRangeKey(params.range) ? params.range : "30d";
  const range = DATE_RANGES[rangeKey];
  const demo = await isDemoMode();

  if (!demo && !isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Overview" subtitle="Business at a glance" />
        <div className="admin-content">
          <div className="admin-panel">
            <DatabaseNotice />
          </div>
        </div>
      </>
    );
  }

  const [metrics, recent] = demo
    ? [demoOverviewMetrics(), demoEnquiriesList()]
    : await Promise.all([
        getOverviewMetrics(range.days),
        listEnquiries({ perPage: 8, sort: "newest" }),
      ]);

  const conversion =
    metrics.conversionRate === null
      ? null
      : `${metrics.conversionRate.toFixed(0)}%`;

  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle={`Business at a glance — ${range.label.toLowerCase()}`}
        actions={<RangePicker basePath="/admin" current={rangeKey} />}
      />

      <div className="admin-content">
        {/* TODAY — what needs attention right now */}
        <section>
          <div className="admin-section-title">
            <h2>Needs attention</h2>
            <p>Live figures, not scoped to the selected range</p>
          </div>
          <div className="admin-stats" style={{ marginTop: 12 }}>
            <StatCard
              label="New enquiries"
              value={metrics.newEnquiries}
              hint="Not yet reviewed"
              accent={metrics.newEnquiries > 0}
            />
            <StatCard
              label="Awaiting a reply"
              value={metrics.unansweredEnquiries}
              hint="No response recorded"
              accent={metrics.unansweredEnquiries > 0}
            />
            <StatCard
              label="Active projects"
              value={metrics.activeProjects}
              hint="Accepted through to launch"
            />
            <StatCard
              label="Enquiries today"
              value={metrics.enquiriesToday}
            />
          </div>
        </section>

        {/* PERIOD */}
        <section>
          <div className="admin-section-title">
            <h2>Activity</h2>
            <p>{range.label}</p>
          </div>
          <div className="admin-stats" style={{ marginTop: 12 }}>
            <StatCard
              label={`Enquiries · ${range.label.toLowerCase()}`}
              value={metrics.enquiriesInRange}
            />
            <StatCard label="Last 7 days" value={metrics.enquiriesThisWeek} />
            <StatCard label="Last 30 days" value={metrics.enquiriesThisMonth} />
            <StatCard
              label="All time"
              value={metrics.enquiriesAllTime}
            />
          </div>
        </section>

        {/* PIPELINE + VALUE */}
        <section>
          <div className="admin-section-title">
            <h2>Pipeline</h2>
            <p>All enquiries by stage</p>
          </div>
          <div className="admin-stats" style={{ marginTop: 12 }}>
            <StatCard
              label="Won"
              value={metrics.wonCount}
              hint="Won, in progress or completed"
            />
            <StatCard label="Quoted" value={metrics.quotedCount} />
            <StatCard label="Lost" value={metrics.lostCount} />
            <StatCard
              label="Conversion rate"
              value={conversion}
              hint={
                metrics.conversionSampleSize === 0
                  ? "Not enough data — no enquiries have reached a decision"
                  : `Derived from ${metrics.conversionSampleSize} decided ${
                      metrics.conversionSampleSize === 1 ? "enquiry" : "enquiries"
                    }`
              }
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <Panel title="Stage breakdown">
              <BarChart
                caption="Enquiries by stage"
                data={metrics.pipeline
                  .filter((item) => item.count > 0)
                  .map((item) => ({
                    label:
                      ENQUIRY_STATUS_LABELS[item.status as EnquiryStatus] ??
                      item.status,
                    count: item.count,
                  }))}
                emptyLabel="No enquiries yet — the pipeline will populate as they arrive."
              />
            </Panel>

            <Panel
              title="Project value"
              description="Summed from values you record on projects"
            >
              <div className="admin-stats">
                <StatCard
                  label="Active pipeline"
                  value={formatCurrency(metrics.pipelineValue)}
                  hint={
                    metrics.pipelineValue === null
                      ? "No project values recorded"
                      : "Accepted through to launch"
                  }
                />
                <StatCard
                  label="Completed"
                  value={formatCurrency(metrics.completedValue)}
                  hint={
                    metrics.completedValue === null
                      ? "No completed values recorded"
                      : "Completed and maintenance"
                  }
                />
              </div>
            </Panel>
          </div>
        </section>

        {/* DEADLINES */}
        <Panel
          title="Upcoming deadlines"
          description="Projects with a date set, soonest first"
          flush
        >
          {metrics.upcomingDeadlines.length === 0 ? (
            <EmptyState
              title="No deadlines recorded"
              description="Add a deadline to a project and it will appear here."
            >
              <Link className="admin-button" href="/admin/projects">
                Go to projects
              </Link>
            </EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption>Upcoming project deadlines</caption>
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Status</th>
                    <th scope="col">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.upcomingDeadlines.map((project) => (
                    <tr key={project.id}>
                      <td data-label="Project">
                        <Link
                          className="admin-table__main"
                          href={`/admin/projects?highlight=${project.id}`}
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={project.status} kind="project" />
                      </td>
                      <td data-label="Deadline">{formatDate(project.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* RECENT ENQUIRIES */}
        <Panel
          title="Latest enquiries"
          action={
            <Link className="admin-button admin-button--small" href="/admin/enquiries">
              View all
            </Link>
          }
          flush
        >
          {recent.rows.length === 0 ? (
            <EmptyState
              title="No enquiries yet"
              description="When someone submits the form on the public site it will appear here immediately."
            >
              <Link className="admin-button" href="/" target="_blank">
                Open the public site
              </Link>
            </EmptyState>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption>Most recent enquiries</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Project</th>
                    <th scope="col">Budget</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.rows.map((enquiry) => (
                    <tr key={enquiry.id}>
                      <td data-label="Name">
                        <Link
                          className="admin-table__main"
                          href={`/admin/enquiries/${enquiry.id}`}
                        >
                          {enquiry.name}
                        </Link>
                        {enquiry.business_name && (
                          <span className="admin-table__sub">
                            {enquiry.business_name}
                          </span>
                        )}
                      </td>
                      <td data-label="Project">{enquiry.project_type}</td>
                      <td data-label="Budget">{enquiry.budget ?? "—"}</td>
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
          )}
        </Panel>
      </div>
    </>
  );
}
