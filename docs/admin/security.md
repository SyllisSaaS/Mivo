# Security Notes

How the Mivo site protects the private admin area and the client data inside it,
and — just as importantly — what it does not protect against.

This is not a claim that the system is unbreakable. It is a record of the
decisions that were made, so that future changes can be checked against them and
the gaps are written down rather than forgotten.

## What is being protected

| Asset | Where it lives | Who should see it |
|-------|----------------|-------------------|
| Enquiries from the quote form | `enquiries` table | Owner only |
| Private notes on enquiries | `enquiry_notes` table | Owner only |
| Client project records (value, payments, links) | `projects` table | Owner only |
| Admin activity trail | `audit_log` table | Owner only |
| Owner credentials | `ADMIN_PASSWORD_HASH` env var + `admins` table | Nobody, including the UI |
| Session signing key | `AUTH_SECRET` env var | Nobody |
| Database credentials | `DATABASE_URL` env var | Nobody |
| The marketing site itself | `src/app/page.tsx` and friends | Everybody — it is meant to be public |

The public site staying public is a requirement, not an oversight. The security
boundary is around `/admin` and `/api/admin`, not around the whole site.

## Authentication architecture

One account. No sign-up, no invites, no password-reset email — every one of
those would be another way in.

- The password is never stored anywhere. Only a bcrypt hash (12 rounds) exists,
  in `ADMIN_PASSWORD_HASH` and in the `admins` row generated from it.
- Sign-in goes through a Server Action, so Next.js verifies the request origin.
  That handles CSRF for state-changing requests without a hand-rolled token.
- `verifyCredentials()` runs a bcrypt comparison even when no account row
  matched, so timing cannot be used to work out whether an address exists. The
  email is compared with a constant-time comparison.
- Every failure — unknown email, wrong password, not the allowlisted owner —
  returns the same message. The login form is not an account-enumeration oracle.
- A successful sign-in mints a **new** session id, so a cookie value that
  existed beforehand can never be promoted to an authenticated one (session
  fixation).
- The session cookie is an HS256 JWT signed with `AUTH_SECRET`, set `HttpOnly`
  (page JavaScript cannot read it), `SameSite=Lax`, `Path=/`, and `Secure` in
  production. It expires after 12 hours.
- The JWT's `jti` is the primary key of a row in `admin_sessions`. Signing out
  sets `revoked_at` on that row, which is what makes logout a real revocation
  rather than a browser-side cookie delete.

Full step-by-step walkthrough: `README.md` in this folder.

## Authorisation architecture — defence in depth

There are two checks, and they are not equal.

**Layer 1 — the Edge proxy (`src/proxy.ts`) is a fast filter.**
It matches `/admin`, `/admin/*` and `/api/admin/*`, and turns away any request
with no `mivo_session` cookie: a redirect to `/admin/login` for pages, a `401`
JSON response for admin APIs. Its job is to stop unauthenticated traffic before
any admin code runs.

It runs on the Edge runtime, which has no database access, so it **cannot**
verify that the cookie is genuine. Anyone can set a cookie called
`mivo_session` with any value and get past this layer. That is expected.

**Layer 2 — `requireSession()` on the server is the real gate.**
Every admin page (through `src/app/admin/(dashboard)/layout.tsx`), every Server
Action and every protected route handler calls `requireSession()` or
`getSession()` from `src/lib/auth.ts`. That function:

1. verifies the JWT signature and expiry against `AUTH_SECRET`;
2. looks up `admin_sessions` by session id and admin id, requiring
   `revoked_at IS NULL` and `expires_at > now()`;
3. joins `admins` and re-checks that the account email still equals
   `ADMIN_EMAIL`.

If any step fails there is no session, and the request is redirected or
`401`-ed. Failures are treated as "no access", including database errors — the
check fails closed.

Two rules follow from this, and they matter for every future change:

- **Never** treat the proxy as sufficient. If you add an admin page, Server
  Action or `/api/admin` route, it must call `requireSession()` or
  `getSession()` itself. The private CSV export route does this even though the
  proxy already rejected cookieless requests, and new routes should copy that.
- **Never** move the real check into the proxy. It cannot reach the database, so
  it cannot know whether a session is still valid.

`tests/access-control.test.mjs` exercises both layers over real HTTP: no cookie,
a garbage cookie, and a correctly signed cookie with no matching session row are
all refused.

## Secret handling

- Secrets are read only through `src/lib/env.ts`, which is server-only. Nothing
  in `src/lib/` that touches secrets is imported into a client component.
- No secret is prefixed `NEXT_PUBLIC_`. That prefix inlines the value into the
  browser bundle. The only `NEXT_PUBLIC_` variable in the project is
  `NEXT_PUBLIC_SITE_URL`, which is the site's own public address.
- `.env.example` is committed and contains variable names with empty values.
  `.env`, `.env.local` and `.env*.local` are gitignored and must stay untracked.
- `/admin/settings` reports variable **names** and a Set / Not set badge. It
  never renders a value, and it should stay that way — a stolen session would
  otherwise hand over the database credentials.
- Credentials cannot be changed from inside the admin UI. Rotation happens
  through environment variables and `npm run db:setup`, so somebody with a
  stolen session cannot lock the owner out of the account.
- The access-control test suite asserts that the public HTML and every
  `/_next/static/` asset it references contain none of the server-only values it
  started the server with.

If a secret is ever committed, pasted into a client component, or shared
anywhere it should not be, rotate it. Removing the commit is not enough — assume
it was seen.

## Rate limiting

Implemented in `src/lib/rate-limit.ts` as a sliding window over a
`rate_limit_hits` table in Postgres. A shared store is used rather than
in-process memory because the app runs on serverless infrastructure where
consecutive requests can land on different instances.

| Bucket | Limit | Window | Guards against |
|--------|-------|--------|----------------|
| `login:<ip hash>` | 8 | 15 minutes | Password guessing from one source |
| `login_account:<email hash>` | 10 | 1 hour | Slow guessing spread across many IPs |
| `enquiry:<ip hash>` | 5 | 1 hour | Form spam and enquiry-table flooding |
| `analytics:<ip hash>` | 120 | 1 minute | Analytics table flooding |

Bucket keys use salted hashes of the IP address and email, so the rate-limit
table holds no raw personal data. A successful login clears its own IP bucket.

Honest caveats:

- **The in-memory fallback is not real protection.** When `DATABASE_URL` is
  unset, limits are counted in a `Map` inside one process. That is fine for
  local development, and it is why the code logs a warning if it happens in
  production — on serverless hosting each instance would keep its own counter,
  so the effective limit is the stated number multiplied by however many
  instances happen to be warm. If you run the admin area in production without a
  database, assume there is no rate limiting at all.
- **Limits fail open.** If the database errors mid-check, the request is
  allowed. That is a deliberate trade — a database hiccup should not lock real
  visitors out of the enquiry form — but it means a sustained database outage
  removes rate limiting. Login is still protected by password verification,
  which fails closed.
- The limits are sized for a one-person site, not for a determined attacker with
  a large IP pool.

## Private data handling

- **Enquiries and notes are owner-only.** They are read exclusively through
  authenticated admin pages and Server Actions.
- **The public enquiry API is write-only.** `POST /api/enquiries` can create an
  enquiry and nothing else. There is no `GET`, `PUT`, `PATCH` or `DELETE`
  handler, and the test suite asserts each of those returns `405`. Reading or
  editing an enquiry requires a session.
- **Submissions are validated and clamped server-side** before storage
  (`src/lib/validation.ts`): allowlisted select values, length caps, control
  characters stripped, non-`http(s)` URL schemes dropped. Client-side validation
  is convenience only.
- **Error messages to visitors are generic.** Real failure detail goes to the
  server log, never into the response.
- **Bot submissions are absorbed quietly.** A filled honeypot or an
  implausibly fast submission returns a success response without storing
  anything, so a spammer gets no feedback to tune against.
- **IP addresses are never stored raw.** They are salted with `IP_HASH_SALT` and
  hashed (`src/lib/request.ts`) before being used for rate limiting or recorded
  against a session.
- **Analytics is anonymous.** Only an allowlisted event name, a truncated path
  and the referrer hostname are stored. No cookies, no identifiers, no IPs, so
  rows cannot be tied back to an individual.
- **All SQL is parameterised.** Sort columns come from an allowlist rather than
  from user input.
- **CSV exports contain real client data.** They require a valid session, and
  each export is written to `audit_log`. Once downloaded, the file is outside the
  application's control — store it somewhere sensible and delete copies you no
  longer need.
- **Enquiry notification emails contain the enquiry in plain text.** That is the
  point of them, but it means the security of that data also depends on the
  security of the mailbox in `EMAIL_TO`. Use one with a strong password and
  two-factor authentication.

## Admin route protection

- `src/proxy.ts` matches `/admin`, `/admin/:path*` and `/api/admin/:path*`.
  `/admin/login` is deliberately exempt so it stays reachable.
- The `next` parameter on the login redirect is only ever a relative in-app
  path, checked by `safeNext()`, so it cannot be turned into an open redirect.
- `next.config.ts` sends `Cache-Control: no-store, max-age=0, must-revalidate`
  and `X-Robots-Tag: noindex, nofollow, noarchive` on every `/admin/*` response,
  so no CDN or shared cache holds a rendered admin page and search engines are
  told to stay out.
- Every response gets a strict Content Security Policy, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY` (clickjacking), a restrictive
  `Permissions-Policy`, and `Referrer-Policy: strict-origin-when-cross-origin`.
  `poweredByHeader` is off.
- `robots.txt` disallows `/admin` and `/api/`.

## Deployment security

- **Production stays public.** Vercel Deployment Protection must not be enabled
  on the production domain — the marketing site needs to be readable by anyone,
  including search engines. The private area is protected by application
  authentication, not by hiding the deployment.
- **Preview deployments can be protected separately.** If you want preview URLs
  restricted to you, enable protection for the Preview environment only. That is
  the right place for it: previews often point at a real database.
- **Production secrets are marked sensitive** in Vercel so they cannot be read
  back out of the dashboard after being set.
- **Use a different `AUTH_SECRET` per environment**, and ideally a separate
  database for previews and local development. A leaked preview secret should not
  be a production incident.
- **HTTPS everywhere.** The session cookie is `Secure` in production, and the CSP
  includes `upgrade-insecure-requests`.
- Environment variable changes only take effect on a new deployment. After
  rotating anything, redeploy and sign in once to confirm.

## Incident response basics

If you think the admin area has been accessed by somebody else, work top to
bottom:

1. **Kill every session.** Rotate `AUTH_SECRET` (`openssl rand -base64 48`),
   update it in Vercel and redeploy. Every existing cookie now fails signature
   verification. Faster than rotating anything else, and it does not depend on
   the database.
2. **Change the password.** `npm run admin:hash`, update `ADMIN_PASSWORD_HASH`,
   run `npm run db:setup` against each database — that upserts the hash and
   revokes any remaining live sessions.
3. **Rotate the database credential** in your provider's dashboard, update
   `DATABASE_URL`, redeploy. Do this whenever you cannot rule out the connection
   string having been read.
4. **Rotate `RESEND_API_KEY`**, then delete the old key in Resend.
5. **Review `audit_log`.** It is visible on `/admin/settings`, or query it
   directly:

   ```sql
   SELECT created_at, action, target_type, target_id, detail
     FROM audit_log ORDER BY created_at DESC LIMIT 100;
   ```

   Look for `admin.login` entries you do not recognise, runs of
   `admin.login_failed`, and any `enquiry.exported` or `*.deleted` you did not
   perform.
6. **Check the sessions table** for anything still live:

   ```sql
   SELECT id, created_at, expires_at, revoked_at, ip_hash, user_agent
     FROM admin_sessions ORDER BY created_at DESC LIMIT 50;
   ```

7. **Check the data.** Compare enquiry and project rows against what you expect;
   the audit trail should account for any deletions.
8. **Write down what happened** and what you changed, in a dated note. Future
   you will want it.

If client data was exposed, tell the affected clients. That is the part it is
tempting to skip, and the part that matters most.

## Known limitations

Written down deliberately. None of these are secret, and pretending otherwise
would be worse than admitting them.

- **No two-factor authentication.** A single password protects the admin area.
  This is the biggest gap. Use a long, unique password from a password manager,
  and treat 2FA as the next security feature to add rather than a nice-to-have.
- **`robots.txt` is not security.** It asks well-behaved crawlers not to index
  `/admin`. It does nothing to stop anyone from visiting it. The actual
  protection is `requireSession()`.
- **One account, no recovery.** There is exactly one owner login and no reset
  email. Lose the password and recovery means generating a new hash and
  re-running the setup script — you need access to the environment variables and
  the database to get back in.
- **Rate limiting depends on the database**, fails open on error, and its
  in-memory fallback is ineffective across serverless instances (see above).
- **The CSP allows `'unsafe-inline'` for scripts.** Next.js injects small inline
  bootstrap scripts, and this project does not yet use nonces. It weakens the
  CSP's value as an XSS backstop.
- **No automated test of the signed-in path.** The access-control suite proves
  the closed door stays closed, but it never connects to a database, so "the
  owner can actually get in and the dashboard renders" is still a manual check.
- **The audit log is not tamper-proof.** Anyone with database access can edit or
  delete rows. It is a record of what the application did, not forensic
  evidence.
- **Sessions last 12 hours** with no idle timeout and no per-request re-binding
  to IP or user agent. A cookie stolen from a signed-in browser is usable until
  it expires or is revoked.
- **No dependency-scanning or secret-scanning automation** in CI yet. Running
  `npm audit` and re-reading `.gitignore` before a release is currently a manual
  habit.

## Before you ship a change to the admin area

- [ ] Every new admin page, Server Action and `/api/admin` route calls
      `requireSession()` or `getSession()` itself.
- [ ] No new secret is prefixed `NEXT_PUBLIC_`, and no secret is read outside
      `src/lib/env.ts`.
- [ ] No server-only module is imported into a client component.
- [ ] New SQL is parameterised; any sort or filter column comes from an
      allowlist.
- [ ] Any new public endpoint validates its input server-side and is rate
      limited.
- [ ] Error responses to visitors stay generic; detail goes to the log.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` all
      pass.
- [ ] `git status` shows no `.env` file about to be committed.
