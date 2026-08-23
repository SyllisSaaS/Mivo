import { isDatabaseConfigured, query, queryOne } from "./db";
import { ACTIVE_PROJECT_STATUSES, OPEN_ENQUIRY_STATUSES } from "./constants";

/**
 * Aggregate business metrics.
 *
 * Every figure here is counted from stored rows. Nothing is estimated or
 * simulated. Where there is no data, callers receive 0 or an empty list and
 * the UI states that explicitly rather than inventing a number.
 */

function daysParam(days: number | null): { clause: string; params: unknown[] } {
  if (days === null) return { clause: "", params: [] };
  return {
    clause: `WHERE created_at > now() - ($1 || ' days')::interval`,
    params: [String(days)],
  };
}

export interface OverviewMetrics {
  configured: boolean;
  enquiriesInRange: number;
  enquiriesAllTime: number;
  newEnquiries: number;
  unansweredEnquiries: number;
  enquiriesToday: number;
  enquiriesThisWeek: number;
  enquiriesThisMonth: number;
  pipeline: { status: string; count: number }[];
  activeProjects: number;
  completedProjects: number;
  wonCount: number;
  lostCount: number;
  quotedCount: number;
  pipelineValue: number | null;
  completedValue: number | null;
  conversionRate: number | null;
  conversionSampleSize: number;
  upcomingDeadlines: {
    id: number;
    name: string;
    deadline: string;
    status: string;
  }[];
}

export async function getOverviewMetrics(
  days: number | null
): Promise<OverviewMetrics> {
  const empty: OverviewMetrics = {
    configured: false,
    enquiriesInRange: 0,
    enquiriesAllTime: 0,
    newEnquiries: 0,
    unansweredEnquiries: 0,
    enquiriesToday: 0,
    enquiriesThisWeek: 0,
    enquiriesThisMonth: 0,
    pipeline: [],
    activeProjects: 0,
    completedProjects: 0,
    wonCount: 0,
    lostCount: 0,
    quotedCount: 0,
    pipelineValue: null,
    completedValue: null,
    conversionRate: null,
    conversionSampleSize: 0,
    upcomingDeadlines: [],
  };

  if (!isDatabaseConfigured()) return empty;

  const range = daysParam(days);

  const [counts, statusRows, projectRows, values, deadlines] = await Promise.all([
    queryOne<{
      in_range: string;
      all_time: string;
      new_count: string;
      unanswered: string;
      today: string;
      week: string;
      month: string;
    }>(
      `SELECT
         (SELECT count(*) FROM enquiries ${range.clause})::text AS in_range,
         (SELECT count(*) FROM enquiries)::text AS all_time,
         (SELECT count(*) FROM enquiries WHERE status = 'NEW')::text AS new_count,
         (SELECT count(*) FROM enquiries WHERE responded_at IS NULL
            AND status NOT IN ('ARCHIVED', 'LOST'))::text AS unanswered,
         (SELECT count(*) FROM enquiries
            WHERE created_at >= date_trunc('day', now()))::text AS today,
         (SELECT count(*) FROM enquiries
            WHERE created_at > now() - interval '7 days')::text AS week,
         (SELECT count(*) FROM enquiries
            WHERE created_at > now() - interval '30 days')::text AS month`,
      range.params
    ),
    query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM enquiries
        GROUP BY status ORDER BY count(*) DESC`
    ),
    queryOne<{ active: string; completed: string }>(
      `SELECT
         (SELECT count(*) FROM projects WHERE status = ANY($1))::text AS active,
         (SELECT count(*) FROM projects WHERE status = 'COMPLETED')::text AS completed`,
      [ACTIVE_PROJECT_STATUSES]
    ),
    queryOne<{ pipeline: string | null; completed: string | null }>(
      `SELECT
         (SELECT sum(value) FROM projects
            WHERE status = ANY($1))::text AS pipeline,
         (SELECT sum(value) FROM projects
            WHERE status IN ('COMPLETED', 'MAINTENANCE'))::text AS completed`,
      [ACTIVE_PROJECT_STATUSES]
    ),
    query<{ id: number; name: string; deadline: string; status: string }>(
      `SELECT id, name, deadline::text, status FROM projects
        WHERE deadline IS NOT NULL
          AND status NOT IN ('COMPLETED', 'CANCELLED')
        ORDER BY deadline ASC LIMIT 5`
    ),
  ]);

  const statusMap = new Map(
    statusRows.map((r) => [r.status, Number(r.count)] as const)
  );

  const won = statusMap.get("WON") ?? 0;
  const inProgress = statusMap.get("IN_PROGRESS") ?? 0;
  const completed = statusMap.get("COMPLETED") ?? 0;
  const lost = statusMap.get("LOST") ?? 0;
  const quoted = statusMap.get("QUOTED") ?? 0;

  // Conversion is only meaningful once enquiries have reached a decision.
  const decided = won + inProgress + completed + lost;
  const wonTotal = won + inProgress + completed;

  return {
    configured: true,
    enquiriesInRange: Number(counts?.in_range ?? "0"),
    enquiriesAllTime: Number(counts?.all_time ?? "0"),
    newEnquiries: Number(counts?.new_count ?? "0"),
    unansweredEnquiries: Number(counts?.unanswered ?? "0"),
    enquiriesToday: Number(counts?.today ?? "0"),
    enquiriesThisWeek: Number(counts?.week ?? "0"),
    enquiriesThisMonth: Number(counts?.month ?? "0"),
    pipeline: OPEN_ENQUIRY_STATUSES.concat(["WON", "LOST"]).map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    })),
    activeProjects: Number(projectRows?.active ?? "0"),
    completedProjects: Number(projectRows?.completed ?? "0"),
    wonCount: wonTotal,
    lostCount: lost,
    quotedCount: quoted,
    pipelineValue: values?.pipeline ? Number(values.pipeline) : null,
    completedValue: values?.completed ? Number(values.completed) : null,
    conversionRate: decided > 0 ? (wonTotal / decided) * 100 : null,
    conversionSampleSize: decided,
    upcomingDeadlines: deadlines,
  };
}

export interface AnalyticsBreakdown {
  configured: boolean;
  totalEnquiries: number;
  byWeek: { period: string; count: number }[];
  byProjectType: { label: string; count: number }[];
  byBudget: { label: string; count: number }[];
  byLeadSource: { label: string; count: number }[];
  byStatus: { label: string; count: number }[];
  averageQuotedValue: number | null;
  quotedSampleSize: number;
  averageResponseHours: number | null;
  responseSampleSize: number;
  topFeatureWords: { label: string; count: number }[];
  pageViews: { path: string; count: number }[];
  eventCounts: { name: string; count: number }[];
}

export async function getAnalyticsBreakdown(
  days: number | null,
  leadSource?: string
): Promise<AnalyticsBreakdown> {
  const empty: AnalyticsBreakdown = {
    configured: false,
    totalEnquiries: 0,
    byWeek: [],
    byProjectType: [],
    byBudget: [],
    byLeadSource: [],
    byStatus: [],
    averageQuotedValue: null,
    quotedSampleSize: 0,
    averageResponseHours: null,
    responseSampleSize: 0,
    topFeatureWords: [],
    pageViews: [],
    eventCounts: [],
  };

  if (!isDatabaseConfigured()) return empty;

  // Filters are applied as parameters; `$1` is always the day window and
  // `$2` the optional lead source.
  const filters: string[] = [];
  const params: unknown[] = [];

  if (days !== null) {
    params.push(String(days));
    filters.push(`created_at > now() - ($${params.length} || ' days')::interval`);
  }
  if (leadSource) {
    params.push(leadSource);
    filters.push(`lead_source = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [
    total,
    byWeek,
    byType,
    byBudget,
    bySource,
    byStatus,
    quoted,
    response,
    features,
    views,
    events,
  ] = await Promise.all([
    queryOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM enquiries ${where}`,
      params
    ),
    query<{ period: string; count: string }>(
      `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS period,
              count(*)::text AS count
         FROM enquiries ${where}
        GROUP BY 1 ORDER BY 1 ASC LIMIT 26`,
      params
    ),
    query<{ label: string; count: string }>(
      `SELECT project_type AS label, count(*)::text AS count
         FROM enquiries ${where}
        GROUP BY 1 ORDER BY count(*) DESC`,
      params
    ),
    query<{ label: string; count: string }>(
      `SELECT coalesce(budget, 'Not specified') AS label, count(*)::text AS count
         FROM enquiries ${where}
        GROUP BY 1 ORDER BY count(*) DESC`,
      params
    ),
    query<{ label: string; count: string }>(
      `SELECT coalesce(lead_source, 'Unknown') AS label, count(*)::text AS count
         FROM enquiries ${where}
        GROUP BY 1 ORDER BY count(*) DESC`,
      params
    ),
    query<{ label: string; count: string }>(
      `SELECT status AS label, count(*)::text AS count
         FROM enquiries ${where}
        GROUP BY 1 ORDER BY count(*) DESC`,
      params
    ),
    queryOne<{ avg: string | null; n: string }>(
      `SELECT avg(quoted_value)::text AS avg, count(quoted_value)::text AS n
         FROM enquiries ${where}`,
      params
    ),
    queryOne<{ avg: string | null; n: string }>(
      `SELECT avg(extract(epoch FROM (responded_at - created_at)) / 3600)::text AS avg,
              count(responded_at)::text AS n
         FROM enquiries ${where}${where ? " AND" : " WHERE"} responded_at IS NOT NULL`,
      params
    ),
    query<{ features: string }>(
      `SELECT features FROM enquiries
        ${where}${where ? " AND" : " WHERE"} features IS NOT NULL
        LIMIT 500`,
      params
    ),
    query<{ path: string; count: string }>(
      days === null
        ? `SELECT coalesce(path, '/') AS path, count(*)::text AS count
             FROM analytics_events WHERE name = 'page_view'
            GROUP BY 1 ORDER BY count(*) DESC LIMIT 10`
        : `SELECT coalesce(path, '/') AS path, count(*)::text AS count
             FROM analytics_events
            WHERE name = 'page_view'
              AND created_at > now() - ($1 || ' days')::interval
            GROUP BY 1 ORDER BY count(*) DESC LIMIT 10`,
      days === null ? [] : [String(days)]
    ),
    query<{ name: string; count: string }>(
      days === null
        ? `SELECT name, count(*)::text AS count FROM analytics_events
            GROUP BY 1 ORDER BY count(*) DESC`
        : `SELECT name, count(*)::text AS count FROM analytics_events
            WHERE created_at > now() - ($1 || ' days')::interval
            GROUP BY 1 ORDER BY count(*) DESC`,
      days === null ? [] : [String(days)]
    ),
  ]);

  return {
    configured: true,
    totalEnquiries: Number(total?.count ?? "0"),
    byWeek: byWeek.map((r) => ({ period: r.period, count: Number(r.count) })),
    byProjectType: byType.map((r) => ({ label: r.label, count: Number(r.count) })),
    byBudget: byBudget.map((r) => ({ label: r.label, count: Number(r.count) })),
    byLeadSource: bySource.map((r) => ({ label: r.label, count: Number(r.count) })),
    byStatus: byStatus.map((r) => ({ label: r.label, count: Number(r.count) })),
    averageQuotedValue: quoted?.avg ? Number(quoted.avg) : null,
    quotedSampleSize: Number(quoted?.n ?? "0"),
    averageResponseHours: response?.avg ? Number(response.avg) : null,
    responseSampleSize: Number(response?.n ?? "0"),
    topFeatureWords: countFeatureKeywords(features.map((r) => r.features)),
    pageViews: views.map((r) => ({ path: r.path, count: Number(r.count) })),
    eventCounts: events.map((r) => ({ name: r.name, count: Number(r.count) })),
  };
}

/**
 * Counts how often known feature keywords appear in free-text answers.
 * Keyword matching only — this is a derived signal, not exact data, and the
 * UI labels it as such.
 */
const FEATURE_KEYWORDS = [
  "contact form",
  "gallery",
  "booking",
  "shop",
  "blog",
  "map",
  "newsletter",
  "payment",
  "login",
  "dashboard",
  "seo",
  "animation",
];

function countFeatureKeywords(
  texts: string[]
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const keyword of FEATURE_KEYWORDS) {
      if (lower.includes(keyword)) {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
