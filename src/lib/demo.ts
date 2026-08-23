import { cookies } from "next/headers";
import type { EnquiryListResult, EnquiryListRow } from "./enquiries";
import type { AnalyticsBreakdown, OverviewMetrics } from "./metrics";
import type { ProjectRow } from "./projects";

/** Cookie name — admin-only, never read on the public site. */
export const DEMO_COOKIE = "mivo_demo_mode";

/** Demo rows use high IDs so they never collide with real database rows. */
export const DEMO_ENQUIRY_ID_START = 9000;

export async function isDemoMode(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DEMO_COOKIE)?.value === "1";
}

export function isDemoEnquiryId(id: number): boolean {
  return id >= DEMO_ENQUIRY_ID_START;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function demoOverviewMetrics(): OverviewMetrics {
  return {
    configured: true,
    enquiriesInRange: 14,
    enquiriesAllTime: 47,
    newEnquiries: 3,
    unansweredEnquiries: 5,
    enquiriesToday: 2,
    enquiriesThisWeek: 9,
    enquiriesThisMonth: 14,
    pipeline: [
      { status: "NEW", count: 3 },
      { status: "REVIEWING", count: 4 },
      { status: "QUOTED", count: 6 },
      { status: "NEGOTIATING", count: 2 },
      { status: "WON", count: 5 },
      { status: "IN_PROGRESS", count: 3 },
      { status: "COMPLETED", count: 8 },
      { status: "LOST", count: 4 },
    ],
    activeProjects: 6,
    completedProjects: 8,
    wonCount: 16,
    lostCount: 4,
    quotedCount: 6,
    pipelineValue: 12450,
    completedValue: 18700,
    conversionRate: 80,
    conversionSampleSize: 20,
    upcomingDeadlines: [
      {
        id: 9001,
        name: "Harbour Café website",
        deadline: daysAhead(5),
        status: "IN_PROGRESS",
      },
      {
        id: 9002,
        name: "North Lane Studio portfolio",
        deadline: daysAhead(12),
        status: "CLIENT_REVIEW",
      },
    ],
  };
}

export function demoAnalyticsBreakdown(): AnalyticsBreakdown {
  return {
    configured: true,
    totalEnquiries: 47,
    byWeek: [
      { period: "2026-07-07", count: 3 },
      { period: "2026-07-14", count: 5 },
      { period: "2026-07-21", count: 4 },
      { period: "2026-07-28", count: 6 },
      { period: "2026-08-04", count: 7 },
      { period: "2026-08-11", count: 8 },
      { period: "2026-08-18", count: 9 },
    ],
    byProjectType: [
      { label: "Business website", count: 18 },
      { label: "Landing page", count: 11 },
      { label: "Portfolio", count: 8 },
      { label: "Website redesign", count: 6 },
      { label: "E-commerce", count: 4 },
    ],
    byBudget: [
      { label: "£1,000 – £2,500", count: 16 },
      { label: "£500 – £1,000", count: 12 },
      { label: "£2,500+", count: 9 },
      { label: "Under £500", count: 6 },
      { label: "Not specified", count: 4 },
    ],
    byLeadSource: [
      { label: "Mivo website", count: 19 },
      { label: "Instagram", count: 11 },
      { label: "Referral", count: 9 },
      { label: "Google", count: 5 },
      { label: "Direct", count: 3 },
    ],
    byStatus: [
      { label: "COMPLETED", count: 8 },
      { label: "QUOTED", count: 6 },
      { label: "REVIEWING", count: 4 },
      { label: "NEW", count: 3 },
      { label: "WON", count: 5 },
    ],
    averageQuotedValue: 1850,
    quotedSampleSize: 14,
    averageResponseHours: 6.5,
    responseSampleSize: 32,
    topFeatureWords: [
      { label: "contact form", count: 22 },
      { label: "gallery", count: 14 },
      { label: "booking", count: 9 },
      { label: "seo", count: 8 },
      { label: "map", count: 6 },
    ],
    pageViews: [
      { path: "/", count: 842 },
      { path: "/#work", count: 312 },
      { path: "/#contact", count: 198 },
    ],
    eventCounts: [
      { name: "page_view", count: 842 },
      { name: "quote_form_started", count: 96 },
      { name: "quote_form_submitted", count: 47 },
      { name: "portfolio_view", count: 312 },
      { name: "contact_click", count: 54 },
    ],
  };
}

export function demoEnquiriesList(): EnquiryListResult {
  const rows: EnquiryListRow[] = [
    {
      id: 9001,
      name: "Alex Morgan",
      business_name: "Harbour Café",
      email: "alex@example.demo",
      project_type: "Business website",
      budget: "£1,000 – £2,500",
      status: "NEW",
      lead_source: "Instagram",
      created_at: daysAgo(0),
    },
    {
      id: 9002,
      name: "Priya Shah",
      business_name: "North Lane Studio",
      email: "priya@example.demo",
      project_type: "Portfolio",
      budget: "£500 – £1,000",
      status: "REVIEWING",
      lead_source: "Referral",
      created_at: daysAgo(2),
    },
    {
      id: 9003,
      name: "James Okonkwo",
      business_name: "Greenfield Plumbing",
      email: "james@example.demo",
      project_type: "Landing page",
      budget: "Under £500",
      status: "QUOTED",
      lead_source: "Mivo website",
      created_at: daysAgo(5),
    },
    {
      id: 9004,
      name: "Elena Rossi",
      business_name: "Rossi Photography",
      email: "elena@example.demo",
      project_type: "Website redesign",
      budget: "£2,500+",
      status: "NEGOTIATING",
      lead_source: "Google",
      created_at: daysAgo(8),
    },
    {
      id: 9005,
      name: "Tom Fletcher",
      business_name: "Fletcher & Co.",
      email: "tom@example.demo",
      project_type: "Business website",
      budget: "£1,000 – £2,500",
      status: "WON",
      lead_source: "Mivo website",
      created_at: daysAgo(14),
    },
  ];

  return {
    rows,
    total: rows.length,
    page: 1,
    perPage: 20,
    totalPages: 1,
  };
}

export function demoProjectsList(): ProjectRow[] {
  const now = new Date().toISOString();
  return [
    {
      id: 9001,
      name: "Harbour Café website",
      client_name: "Alex Morgan",
      enquiry_id: 9001,
      status: "IN_PROGRESS",
      start_date: daysAgo(10).slice(0, 10),
      deadline: daysAhead(5),
      value: "2200",
      deposit_paid: true,
      final_paid: false,
      repo_url: null,
      live_url: null,
      domain: "harbourcafe.example",
      hosting: "Vercel",
      maintenance: false,
      folder_ref: "projects/harbour-cafe",
      notes: "Demo project — not real.",
      created_at: daysAgo(10),
      updated_at: now,
    },
    {
      id: 9002,
      name: "North Lane Studio portfolio",
      client_name: "Priya Shah",
      enquiry_id: 9002,
      status: "CLIENT_REVIEW",
      start_date: daysAgo(21).slice(0, 10),
      deadline: daysAhead(12),
      value: "1450",
      deposit_paid: true,
      final_paid: false,
      repo_url: null,
      live_url: "https://preview.example.demo",
      domain: null,
      hosting: "Vercel",
      maintenance: true,
      folder_ref: null,
      notes: "Demo project — not real.",
      created_at: daysAgo(21),
      updated_at: now,
    },
    {
      id: 9003,
      name: "Greenfield Plumbing landing page",
      client_name: "James Okonkwo",
      enquiry_id: 9003,
      status: "COMPLETED",
      start_date: daysAgo(45).slice(0, 10),
      deadline: daysAgo(5).slice(0, 10),
      value: "750",
      deposit_paid: true,
      final_paid: true,
      repo_url: null,
      live_url: "https://greenfield.example.demo",
      domain: "greenfieldplumbing.example",
      hosting: "Vercel",
      maintenance: false,
      folder_ref: null,
      notes: "Demo project — not real.",
      created_at: daysAgo(45),
      updated_at: daysAgo(5),
    },
  ];
}

export function demoNewEnquiryCount(): number {
  return 3;
}

export function getDemoEnquiry(id: number) {
  const row = demoEnquiriesList().rows.find((r) => r.id === id);
  if (!row) return null;

  const now = new Date().toISOString();
  return {
    ...row,
    website: "https://harbourcafe.example.demo",
    social: "instagram.com/harbourcafe.demo",
    description:
      "Sample enquiry — we need a modern website with menu, opening hours, and a simple contact form. This is demo data only.",
    features: "Contact form, photo gallery, Google Maps embed",
    page_count: "2–5 pages",
    deadline: "Within 6 weeks",
    branding: "Partial — need help refining",
    content_state: "Partial — some content ready",
    quoted_value: id === 9003 ? "850" : id === 9005 ? "1950" : null,
    updated_at: now,
    responded_at: id === 9001 ? null : daysAgo(1),
  };
}

export function getDemoEnquiryNotes(id: number) {
  if (id !== 9002) return [];
  return [
    {
      id: 1,
      body: "Demo note — strong fit, follow up with a quote.",
      created_at: daysAgo(1),
    },
  ];
}
