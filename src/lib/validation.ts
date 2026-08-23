import {
  BRANDING_OPTIONS,
  BUDGET_RANGES,
  CONTENT_OPTIONS,
  EXISTING_SITE_OPTIONS,
  LEAD_SOURCES,
  PAGE_COUNTS,
  PROJECT_TYPES,
} from "./constants";

/**
 * Server-side validation for the public enquiry form.
 *
 * Client-side validation is a convenience only; everything is re-checked and
 * length-capped here before it reaches the database.
 */

export interface EnquiryInput {
  name: string;
  email: string;
  businessName?: string;
  website?: string;
  social?: string;
  projectType: string;
  description: string;
  features?: string;
  pageCount?: string;
  budget?: string;
  deadline?: string;
  branding?: string;
  contentState?: string;
  existingSite?: string;
  leadSource?: string;
}

export interface ValidationFailure {
  ok: false;
  errors: Record<string, string>;
}

export interface ValidationSuccess {
  ok: true;
  value: EnquiryInput;
}

const LIMITS = {
  name: 120,
  email: 254,
  businessName: 160,
  url: 300,
  projectType: 60,
  description: 4000,
  features: 2000,
  shortChoice: 80,
  deadline: 120,
} as const;

/** Trims, collapses whitespace and strips control characters. */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function isEmail(value: string): boolean {
  // Deliberately permissive but structurally strict: one @, no spaces, a dot
  // in the domain. Real verification happens by replying to the address.
  return /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

/** Accepts an http(s) URL, optionally without a scheme, and normalises it. */
function normaliseUrl(value: string): string | null {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString().slice(0, LIMITS.url);
  } catch {
    return null;
  }
}

function oneOf(value: string, options: readonly string[]): string | undefined {
  return options.includes(value) ? value : undefined;
}

export function validateEnquiry(
  raw: unknown
): ValidationSuccess | ValidationFailure {
  const errors: Record<string, string> = {};
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const name = clean(input.name, LIMITS.name);
  if (name.length < 2) {
    errors.name = "Please enter your name.";
  }

  const email = clean(input.email, LIMITS.email).toLowerCase();
  if (!isEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const projectType = clean(input.projectType, LIMITS.projectType);
  if (!oneOf(projectType, PROJECT_TYPES)) {
    errors.projectType = "Please choose a project type.";
  }

  const description = clean(input.description, LIMITS.description);
  if (description.length < 10) {
    errors.description = "Please tell me a little more about the project.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const websiteRaw = clean(input.website, LIMITS.url);
  const socialRaw = clean(input.social, LIMITS.url);

  return {
    ok: true,
    value: {
      name,
      email,
      businessName: clean(input.businessName, LIMITS.businessName) || undefined,
      website: websiteRaw ? (normaliseUrl(websiteRaw) ?? undefined) : undefined,
      social: socialRaw ? (normaliseUrl(socialRaw) ?? undefined) : undefined,
      projectType,
      description,
      features: clean(input.features, LIMITS.features) || undefined,
      pageCount: oneOf(clean(input.pageCount, LIMITS.shortChoice), PAGE_COUNTS),
      budget: oneOf(clean(input.budget, LIMITS.shortChoice), BUDGET_RANGES),
      deadline: clean(input.deadline, LIMITS.deadline) || undefined,
      branding: oneOf(clean(input.branding, LIMITS.shortChoice), BRANDING_OPTIONS),
      contentState: oneOf(
        clean(input.contentState, LIMITS.shortChoice),
        CONTENT_OPTIONS
      ),
      existingSite: oneOf(
        clean(input.existingSite, LIMITS.shortChoice),
        EXISTING_SITE_OPTIONS
      ),
      leadSource: oneOf(clean(input.leadSource, LIMITS.shortChoice), LEAD_SOURCES),
    },
  };
}

/**
 * Spam heuristics for the public form.
 *
 * `honeypot` is a hidden field genuine users never fill in.
 * `elapsedMs` is how long the visitor spent on the form; bots submit instantly.
 */
export function looksAutomated(payload: {
  honeypot?: unknown;
  elapsedMs?: unknown;
}): boolean {
  if (typeof payload.honeypot === "string" && payload.honeypot.trim() !== "") {
    return true;
  }
  const elapsed = Number(payload.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2500) {
    return true;
  }
  return false;
}

export function clampNote(value: unknown): string | null {
  const note = clean(value, 4000);
  return note.length > 0 ? note : null;
}
