import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { once } from "node:events";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

/**
 * End-to-end checks that the private area is actually closed.
 *
 * A real production server is started and real unauthenticated HTTP requests
 * are made against it. These are the tests that would catch the worst kind of
 * regression: an admin page or a private API becoming publicly readable.
 *
 * If the server cannot be built or started, this suite FAILS. It never skips
 * and reports success — a green run has to mean the routes were genuinely
 * exercised over HTTP.
 *
 * What this suite deliberately does NOT do
 * ----------------------------------------
 * It never connects to a real database. DATABASE_URL is pointed at an
 * unroutable address so that the session lookup in `getSession()` is reached
 * and has to fail closed. That proves the negative path (nobody gets in), but
 * it means the authenticated positive path — signing in with the owner
 * password and loading a dashboard page — is NOT covered here. That needs a
 * throwaway database and is checked by hand for now.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NEXT_BIN = path.join(ROOT, "node_modules", ".bin", "next");

const HOST = "127.0.0.1";
const PORT = Number(process.env.ACCESS_CONTROL_TEST_PORT ?? 3987);
const BASE = `http://${HOST}:${PORT}`;

const SESSION_COOKIE = "mivo_session";
const READY_TIMEOUT_MS = 90_000;
const BUILD_TIMEOUT_MS = 600_000;
/** How long a listening-but-erroring server is given before we call it broken. */
const BROKEN_GRACE_MS = 10_000;

/** Signing key for this run only. Generated in memory, never written to disk. */
const AUTH_SECRET = randomBytes(48).toString("base64");
const ADMIN_EMAIL = "owner@example.invalid";
/**
 * DATABASE_URL has to be *set* for the session check to get as far as its
 * database lookup, but the suite must never touch a real database. These are
 * not credentials — they are placeholders that point nowhere, so the lookup
 * always throws and `getSession()` has to fail closed. The URL still needs a
 * user and a password because that is the shape the Neon driver insists on
 * before it will attempt a connection at all.
 */
const UNREACHABLE_DATABASE_URL =
  `postgresql://not-a-real-user:not-a-real-password` +
  `@${HOST}:1/mivo-access-control-test`;

let serverEnv = null;
let server = null;
let serverExit = null;
const serverLog = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collect(stream) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => serverLog.push(chunk));
}

function serverOutput() {
  const text = serverLog.join("").trim();
  return text.length > 0 ? text : "(the server produced no output)";
}

async function buildServerEnv() {
  // A hash of a throwaway password nobody knows. ADMIN_PASSWORD_HASH only has
  // to be present for the admin area to consider itself configured.
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 4);

  return {
    ...process.env,
    NODE_ENV: "production",
    AUTH_SECRET,
    ADMIN_EMAIL,
    ADMIN_PASSWORD_HASH: passwordHash,
    DATABASE_URL: UNREACHABLE_DATABASE_URL,
    // Blank so a stray key in the developer's shell cannot send real email.
    RESEND_API_KEY: "",
    EMAIL_FROM: "",
    EMAIL_TO: "",
    IP_HASH_SALT: randomBytes(16).toString("hex"),
    NEXT_PUBLIC_SITE_URL: BASE,
  };
}

function portInUse(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(true);
      else reject(error);
    });
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port, HOST);
  });
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const build = spawn(NEXT_BIN, ["build"], {
      cwd: ROOT,
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks = [];
    build.stdout.setEncoding("utf8");
    build.stderr.setEncoding("utf8");
    build.stdout.on("data", (chunk) => chunks.push(chunk));
    build.stderr.on("data", (chunk) => chunks.push(chunk));

    build.once("error", reject);
    build.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          `\`next build\` failed (exit ${code}, signal ${signal}). ` +
            `The access-control suite cannot run without a production build.\n` +
            `--- build output ---\n${chunks.join("").trim()}`
        )
      );
    });
  });
}

/** Returns the status of a request to `/`, or null if nothing is listening yet. */
async function probeHomepage() {
  try {
    const response = await fetch(`${BASE}/`, { redirect: "manual" });
    await response.arrayBuffer();
    return response.status;
  } catch {
    return null;
  }
}

async function startServer() {
  // The hostname is passed explicitly on purpose. With no --hostname, Next.js
  // calls os.networkInterfaces() when the socket starts listening so it can
  // print the "Network:" URL; in a sandboxed or otherwise restricted
  // environment that call throws and takes the whole server down.
  server = spawn(
    NEXT_BIN,
    ["start", "--hostname", HOST, "--port", String(PORT)],
    { cwd: ROOT, env: serverEnv, stdio: ["ignore", "pipe", "pipe"] }
  );

  collect(server.stdout);
  collect(server.stderr);

  server.once("error", (error) => {
    serverLog.push(`failed to spawn ${NEXT_BIN}: ${error.message}\n`);
    serverExit = { code: null, signal: null };
  });
  server.once("exit", (code, signal) => {
    serverExit = { code, signal };
  });

  const deadline = Date.now() + READY_TIMEOUT_MS;
  let firstResponseAt = null;
  let lastStatus = null;

  while (Date.now() < deadline) {
    if (serverExit) {
      throw new Error(
        `the production server exited before it was ready ` +
          `(exit ${serverExit.code}, signal ${serverExit.signal}).\n` +
          `--- server output ---\n${serverOutput()}`
      );
    }

    const status = await probeHomepage();

    if (status !== null && status < 500) return;

    if (status !== null) {
      // Listening but broken — a missing or half-written build does this.
      // Give it a short grace period, then fail rather than sitting out the
      // full timeout waiting for something that will never recover.
      lastStatus = status;
      firstResponseAt ??= Date.now();
      if (Date.now() - firstResponseAt > BROKEN_GRACE_MS) {
        throw new Error(
          `the production server is listening on ${BASE} but every request ` +
            `to / returned ${status}. The build output is probably missing ` +
            `or incomplete — try \`npm run build\`.\n` +
            `--- server output ---\n${serverOutput()}`
        );
      }
    }

    await delay(250);
  }

  throw new Error(
    `the production server did not answer on ${BASE} within ` +
      `${READY_TIMEOUT_MS}ms` +
      (lastStatus ? ` (last status ${lastStatus})` : "") +
      `.\n--- server output ---\n${serverOutput()}`
  );
}

/** A structurally valid, correctly signed session token for a session that does not exist. */
async function signedToken() {
  return new SignJWT({ sub: "1" })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(AUTH_SECRET));
}

function request(pathname, { cookie, ...init } = {}) {
  return fetch(`${BASE}${pathname}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
      ...init.headers,
    },
  });
}

before(
  async () => {
    serverEnv = await buildServerEnv();

    if (await portInUse(PORT)) {
      throw new Error(
        `port ${PORT} is already in use, probably by a server left behind by an ` +
          `earlier run. Free it (or set ACCESS_CONTROL_TEST_PORT) and try again.`
      );
    }

    if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
      await runBuild();
    }

    await startServer();
  },
  { timeout: BUILD_TIMEOUT_MS + READY_TIMEOUT_MS }
);

after(
  async () => {
    if (!server || serverExit) return;
    server.kill("SIGTERM");
    const stopped = await Promise.race([
      once(server, "exit").then(() => true),
      delay(5_000).then(() => false),
    ]);
    if (!stopped) server.kill("SIGKILL");
  },
  { timeout: 30_000 }
);

test("the public homepage is reachable", async () => {
  const response = await fetch(`${BASE}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Websites built around/);
});

test("the public homepage leaks no private data or secrets", async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  for (const forbidden of [
    "AUTH_SECRET",
    "DATABASE_URL",
    "ADMIN_PASSWORD_HASH",
    "RESEND_API_KEY",
    "postgres://",
    "postgresql://",
    AUTH_SECRET,
    ADMIN_EMAIL,
    serverEnv.ADMIN_PASSWORD_HASH,
  ]) {
    assert.ok(
      !html.includes(forbidden),
      `public HTML must not contain ${forbidden.slice(0, 24)}`
    );
  }
});

test("no server-only value reaches the client bundle", async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map(
        (match) => match[1]
      )
    ),
  ];
  assert.ok(assets.length > 0, "expected the page to reference built assets");

  for (const asset of assets) {
    const body = await (await fetch(`${BASE}${asset}`)).text();
    for (const forbidden of [
      AUTH_SECRET,
      ADMIN_EMAIL,
      serverEnv.ADMIN_PASSWORD_HASH,
      serverEnv.DATABASE_URL,
      "ADMIN_PASSWORD_HASH",
      "AUTH_SECRET",
      "$2b$",
    ]) {
      assert.ok(
        !body.includes(forbidden),
        `${asset} must not contain ${forbidden.slice(0, 24)}`
      );
    }
  }
});

test("an unauthenticated visitor is redirected away from /admin", async () => {
  const response = await request("/admin");
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/admin\/login/);
});

test("every admin subpage is closed to an unauthenticated visitor", async () => {
  for (const pathname of [
    "/admin/enquiries",
    "/admin/enquiries/1",
    "/admin/analytics",
    "/admin/projects",
    "/admin/settings",
  ]) {
    const response = await request(pathname);
    assert.equal(response.status, 307, `${pathname} should redirect`);
    assert.match(
      response.headers.get("location") ?? "",
      /\/admin\/login/,
      `${pathname} should redirect to login`
    );
  }
});

test("a forged session cookie does not grant access", async () => {
  const response = await request("/admin", { cookie: "not-a-real-token" });
  // The proxy lets a request with *a* cookie past; the server-side session
  // check is what rejects it.
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/admin\/login/);
});

test("a correctly signed token with no session row does not grant access", async () => {
  // A valid signature is not enough: the session must also exist in the
  // database. The lookup cannot succeed here, so access must be refused.
  const response = await request("/admin", { cookie: await signedToken() });
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/admin\/login/);
});

test("the private export API refuses unauthenticated requests", async () => {
  for (const pathname of [
    "/api/admin/export/enquiries",
    "/api/admin/export/analytics",
  ]) {
    const response = await request(pathname);
    assert.equal(response.status, 401, `${pathname} should be 401`);
    const body = await response.text();
    assert.ok(!body.includes("@"), "must not leak enquiry contents");
  }
});

test("the private export API refuses forged and unbacked session cookies", async () => {
  const token = await signedToken();
  for (const cookie of ["not-a-real-token", token]) {
    for (const pathname of [
      "/api/admin/export/enquiries",
      "/api/admin/export/analytics",
    ]) {
      const response = await request(pathname, { cookie });
      assert.equal(response.status, 401, `${pathname} should be 401`);
      const body = await response.text();
      assert.ok(!body.includes("@"), "must not leak enquiry contents");
    }
  }
});

test("the login page is reachable and does not reveal the owner address", async () => {
  const response = await fetch(`${BASE}/admin/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sign in/);
  assert.ok(!html.includes("ADMIN_EMAIL"));
  assert.ok(!html.includes(ADMIN_EMAIL), "must not print the owner address");
});

test("the enquiries API is write-only", async () => {
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    const response = await request("/api/enquiries", { method });
    assert.equal(response.status, 405, `${method} should not be allowed`);
  }
});

test("the enquiries API rejects invalid submissions with field errors", async () => {
  const response = await fetch(`${BASE}/api/enquiries`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "",
      email: "nope",
      projectType: "Landing page",
      description: "short",
      elapsedMs: 30_000,
    }),
  });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.ok(body.errors.name);
  assert.ok(body.errors.email);
});

test("security headers are present on the public site", async () => {
  const response = await fetch(`${BASE}/`);
  assert.ok(response.headers.get("content-security-policy"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin"
  );
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("admin responses are marked no-index and no-store", async () => {
  const response = await fetch(`${BASE}/admin/login`);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("robots.txt disallows the private area", async () => {
  const body = await (await fetch(`${BASE}/robots.txt`)).text();
  assert.match(body, /Disallow: \/admin/);
});

test("the sitemap does not advertise the private area", async () => {
  const body = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert.ok(!body.includes("/admin"), "sitemap must not list admin routes");
});
