/**
 * Shared vocabulary for enquiries and projects.
 *
 * These lists are the single source of truth for both the public form
 * and the admin UI, and are validated server-side on every write.
 */

export const ENQUIRY_STATUSES = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "IN_PROGRESS",
  "COMPLETED",
  "LOST",
  "ARCHIVED",
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

/** Statuses that count as an active, live opportunity. */
export const OPEN_ENQUIRY_STATUSES: EnquiryStatus[] = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "NEGOTIATING",
];

export const PROJECT_STATUSES = [
  "LEAD",
  "QUOTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "CLIENT_REVIEW",
  "READY_TO_LAUNCH",
  "COMPLETED",
  "MAINTENANCE",
  "CANCELLED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  LEAD: "Lead",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In progress",
  CLIENT_REVIEW: "Client review",
  READY_TO_LAUNCH: "Ready to launch",
  COMPLETED: "Completed",
  MAINTENANCE: "Maintenance",
  CANCELLED: "Cancelled",
};

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "ACCEPTED",
  "IN_PROGRESS",
  "CLIENT_REVIEW",
  "READY_TO_LAUNCH",
];

export const PROJECT_TYPES = [
  "Landing page",
  "Business website",
  "Portfolio",
  "E-commerce",
  "Booking website",
  "Website redesign",
  "Custom project",
  "Other",
] as const;

export const BUDGET_RANGES = [
  "Under £500",
  "£500 – £1,000",
  "£1,000 – £2,500",
  "£2,500+",
  "Not sure — need guidance",
] as const;

export const PAGE_COUNTS = [
  "1 (landing page)",
  "2–5 pages",
  "6–10 pages",
  "10+ pages",
] as const;

export const LEAD_SOURCES = [
  "Mivo website",
  "Instagram",
  "Email outreach",
  "Referral",
  "Google",
  "Direct",
  "Other",
] as const;

export const BRANDING_OPTIONS = [
  "Yes — logo and colours ready",
  "Partial — need help refining",
  "No — need guidance",
] as const;

export const CONTENT_OPTIONS = [
  "Yes — text and images ready",
  "Partial — some content ready",
  "No — need help with copy",
] as const;

export const EXISTING_SITE_OPTIONS = [
  "No — starting from scratch",
  "Yes — needs redesign",
  "Yes — minor updates",
] as const;

/** Analytics event names accepted by the public endpoint. */
export const ANALYTICS_EVENTS = [
  "page_view",
  "portfolio_view",
  "quote_form_started",
  "quote_form_submitted",
  "contact_click",
  "portfolio_project_opened",
  "outbound_link_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const DATE_RANGES = {
  today: { label: "Today", days: 1 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  all: { label: "All time", days: null },
} as const;

export type DateRangeKey = keyof typeof DATE_RANGES;

export function isDateRangeKey(value: string | undefined): value is DateRangeKey {
  return value !== undefined && value in DATE_RANGES;
}
