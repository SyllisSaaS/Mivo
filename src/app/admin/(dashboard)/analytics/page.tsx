import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  BarChart,
  DatabaseNotice,
  Notice,
  Panel,
  RangePicker,
  StatCard,
  TrendChart,
  formatCurrency,
} from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import {
  DATE_RANGES,
  ENQUIRY_STATUS_LABELS,
  LEAD_SOURCES,
  isDateRangeKey,
  type EnquiryStatus,
} from "@/lib/constants";
import { isDatabaseConfigured } from "@/lib/db";
import { getAnalyticsBreakdown } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; source?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const rangeKey = isDateRangeKey(params.range) ? params.range : "90d";
  const range = DATE_RANGES[rangeKey];
  const leadSource = LEAD_SOURCES.includes(
    params.source as (typeof LEAD_SOURCES)[number]
  )
    ? params.source
    : undefined;

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminHeader title="Analytics" subtitle="Private business metrics" />
        <div className="admin-content">
          <div className="admin-panel">
            <DatabaseNotice />
          </div>
        </div>
      </>
    );
  }

  const data = await getAnalyticsBreakdown(range.days, leadSource);

  const thin = data.totalEnquiries < 5;

  return (
    <>
      <AdminHeader
        title="Analytics"
        subtitle={`${range.label} · ${data.totalEnquiries} ${
          data.totalEnquiries === 1 ? "enquiry" : "enquiries"
        }${leadSource ? ` from ${leadSource}` : ""}`}
        actions={
          <RangePicker
            basePath="/admin/analytics"
            current={rangeKey}
            extraParams={{ source: leadSource }}
          />
        }
      />

      <div className="admin-content">
        {thin && (
          <Notice tone="warning">
            Not enough data for reliable conclusions yet — {data.totalEnquiries}{" "}
            {data.totalEnquiries === 1 ? "enquiry" : "enquiries"} in this
            period. The figures below are accurate counts of what has been
            recorded, but percentages and averages will move a lot with each new
            enquiry.
          </Notice>
        )}

        <section>
          <div className="admin-section-title">
            <h2>Observed totals</h2>
            <p>Counted directly from stored records</p>
          </div>
          <div className="admin-stats" style={{ marginTop: 12 }}>
            <StatCard label="Enquiries" value={data.totalEnquiries} />
            <StatCard
              label="Average quoted value"
              value={formatCurrency(data.averageQuotedValue)}
              hint={
                data.quotedSampleSize === 0
                  ? "No quote values recorded yet"
                  : `Derived from ${data.quotedSampleSize} quoted ${
                      data.quotedSampleSize === 1 ? "enquiry" : "enquiries"
                    }`
              }
            />
            <StatCard
              label="Average response time"
              value={
                data.averageResponseHours === null
                  ? null
                  : `${data.averageResponseHours.toFixed(1)} h`
              }
              hint={
                data.responseSampleSize === 0
                  ? "No responses recorded yet"
                  : `Derived from ${data.responseSampleSize} responded ${
                      data.responseSampleSize === 1 ? "enquiry" : "enquiries"
                    }`
              }
            />
            <StatCard
              label="Recorded page views"
              value={
                data.eventCounts.find((e) => e.name === "page_view")?.count ?? 0
              }
              hint="Anonymous — no cookies or identifiers"
            />
          </div>
        </section>

        <Panel
          title="Enquiries over time"
          description="Grouped by week commencing"
        >
          <TrendChart data={data.byWeek} />
        </Panel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          <Panel title="By project type">
            <BarChart caption="Enquiries by project type" data={data.byProjectType} />
          </Panel>

          <Panel title="By budget range">
            <BarChart caption="Enquiries by budget" data={data.byBudget} />
          </Panel>

          <Panel
            title="By lead source"
            description="Which channels actually produce enquiries"
            action={
              leadSource ? (
                <Link
                  className="admin-button admin-button--small"
                  href={`/admin/analytics?range=${rangeKey}`}
                >
                  Clear filter
                </Link>
              ) : undefined
            }
          >
            <BarChart caption="Enquiries by lead source" data={data.byLeadSource} />
            <div className="admin-form-actions" style={{ marginTop: 14 }}>
              {LEAD_SOURCES.map((source) => (
                <Link
                  key={source}
                  className="admin-button admin-button--small"
                  href={`/admin/analytics?range=${rangeKey}&source=${encodeURIComponent(
                    source
                  )}`}
                  aria-current={leadSource === source ? "true" : undefined}
                >
                  {source}
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="By status">
            <BarChart
              caption="Enquiries by status"
              data={data.byStatus.map((item) => ({
                label:
                  ENQUIRY_STATUS_LABELS[item.label as EnquiryStatus] ??
                  item.label,
                count: item.count,
              }))}
            />
          </Panel>
        </div>

        <Panel
          title="Most requested features"
          description="Derived signal — keyword matches in free-text answers, not exact figures"
        >
          <BarChart
            caption="Feature keyword mentions"
            data={data.topFeatureWords}
            emptyLabel="No feature keywords detected yet."
          />
        </Panel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          <Panel
            title="Site events"
            description="Anonymous counts — no personal data collected"
          >
            <BarChart
              caption="Recorded site events"
              data={data.eventCounts.map((e) => ({
                label: e.name.replace(/_/g, " "),
                count: e.count,
              }))}
              emptyLabel="No events recorded yet."
            />
          </Panel>

          <Panel title="Most viewed paths">
            <BarChart
              caption="Page views by path"
              data={data.pageViews.map((p) => ({ label: p.path, count: p.count }))}
              emptyLabel="No page views recorded yet."
            />
          </Panel>
        </div>

        <Notice>
          Counts marked <strong>observed</strong> come straight from stored
          rows. Averages, conversion rates and feature keywords are{" "}
          <strong>derived</strong> from those rows and are labelled with their
          sample size so you can judge how much to trust them.
        </Notice>
      </div>
    </>
  );
}
