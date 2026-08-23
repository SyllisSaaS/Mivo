import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";

/**
 * Unit tests for the server-side validation used by the public enquiry API.
 *
 * Imports the compiled output produced by `npm run test:build`.
 */
const require = createRequire(import.meta.url);
const { validateEnquiry, looksAutomated, clampNote } = require("../.test-build/lib/validation.js");

test("rejects a submission with no name", () => {
  const result = validateEnquiry({
    email: "someone@example.com",
    projectType: "Landing page",
    description: "I would like a one page site for my new bakery business.",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
});

test("rejects a malformed email", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "not-an-email",
    projectType: "Landing page",
    description: "I would like a one page site for my new bakery business.",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
});

test("rejects a project type that is not on the allowlist", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "alex@example.com",
    projectType: "Nuclear reactor",
    description: "I would like a one page site for my new bakery business.",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.projectType);
});

test("rejects a description that is too short", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "alex@example.com",
    projectType: "Landing page",
    description: "hi",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.description);
});

test("accepts a valid submission and normalises values", () => {
  const result = validateEnquiry({
    name: "  Alex Smith  ",
    email: "ALEX@Example.COM",
    projectType: "Business website",
    description: "We need a five page site for our plumbing company.",
    website: "example.co.uk",
    budget: "£500 – £1,000",
    pageCount: "2–5 pages",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Alex Smith");
  assert.equal(result.value.email, "alex@example.com");
  assert.equal(result.value.website, "https://example.co.uk/");
  assert.equal(result.value.budget, "£500 – £1,000");
  assert.equal(result.value.pageCount, "2–5 pages");
});

test("drops select values that are not on the allowlist", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "alex@example.com",
    projectType: "Landing page",
    description: "We need a single page for our launch campaign.",
    budget: "one million pounds",
    leadSource: "hacker",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.budget, undefined);
  assert.equal(result.value.leadSource, undefined);
});

test("caps overly long input rather than storing it", () => {
  const result = validateEnquiry({
    name: "A".repeat(500),
    email: "alex@example.com",
    projectType: "Landing page",
    description: "B".repeat(9000),
  });

  assert.equal(result.ok, true);
  assert.ok(result.value.name.length <= 120);
  assert.ok(result.value.description.length <= 4000);
});

test("strips control characters", () => {
  const result = validateEnquiry({
    name: "Alex\u0000\u0007 Smith",
    email: "alex@example.com",
    projectType: "Landing page",
    description: "We need a single page for our launch campaign.",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Alex Smith");
});

test("rejects a non-http url scheme", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "alex@example.com",
    projectType: "Landing page",
    description: "We need a single page for our launch campaign.",
    website: "javascript:alert(1)",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.website, undefined);
});

test("ignores unexpected extra fields", () => {
  const result = validateEnquiry({
    name: "Alex Smith",
    email: "alex@example.com",
    projectType: "Landing page",
    description: "We need a single page for our launch campaign.",
    status: "WON",
    quoted_value: 999999,
    id: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.status, undefined);
  assert.equal(result.value.quoted_value, undefined);
});

test("flags a filled honeypot as automated", () => {
  assert.equal(looksAutomated({ honeypot: "http://spam.example" }), true);
});

test("flags an instant submission as automated", () => {
  assert.equal(looksAutomated({ elapsedMs: 120 }), true);
});

test("treats a considered submission as human", () => {
  assert.equal(looksAutomated({ honeypot: "", elapsedMs: 45_000 }), false);
});

test("clampNote trims and rejects empty notes", () => {
  assert.equal(clampNote("   "), null);
  assert.equal(clampNote(undefined), null);
  assert.equal(clampNote("Classified GREEN"), "Classified GREEN");
});
