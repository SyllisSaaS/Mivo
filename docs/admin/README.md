# Admin System

The private area of the Mivo site, at `/admin`. It is for the site owner only —
there is no sign-up, no invite flow and no second account.

This document explains how it works, how to set it up, and what to do when
something breaks. `security.md` in this folder covers the reasoning behind the
security decisions.

## What it does

| Page | What you use it for |
|------|---------------------|
| `/admin` | Overview — recent enquiries, counts, quick links |
| `/admin/enquiries` | Every enquiry from the public quote form, with status and private notes |
| `/admin/enquiries/[id]` | One enquiry in full, plus notes and status changes |
| `/admin/analytics` | Anonymous site numbers and enquiry breakdowns |
| `/admin/projects` | Client projects — value, deposit, deadline, links |
| `/admin/settings` | Session info, sign-out controls, config check, CSV export, audit trail |

Everything in here is private business data. Nothing on these pages is
reachable without signing in.

## How authentication works, end to end

There is one account. Its email and password hash live in environment
variables, and the account row in the database is generated from them. Nothing
about the account can be changed from inside the admin UI — that is deliberate,
so somebody with a stolen session cannot lock you out of your own site.

The chain, in order:

1. **Password hash in the environment.** You never store the password itself.
   `npm run admin:hash` asks for a password, hashes it with bcrypt (12 rounds)
   and prints the hash. That hash goes into `ADMIN_PASSWORD_HASH`. Your email
   goes into `ADMIN_EMAIL`.
2. **The account row.** `npm run db:setup` copies the email and hash into the
   `admins` table. That is the only way a row gets created — there is no
   registration endpoint anywhere in the codebase.
3. **Sign in.** `/admin/login` posts to a Server Action (`signIn` in
   `src/app/admin/login/actions.ts`). Because it is a Server Action, Next.js
   checks the request origin for you, which covers CSRF.
4. **Rate limiting.** Before anything else, the attempt is counted per IP and
   per account (`src/lib/rate-limit.ts`). Too many attempts and you get a
   "wait a few minutes" message instead of a password check.
5. **bcrypt verify.** `verifyCredentials()` in `src/lib/auth.ts` loads the
   `admins` row, runs `bcrypt.compare()` against the stored hash, and separately
   checks the email still matches `ADMIN_EMAIL` using a constant-time
   comparison. A bcrypt comparison runs even when no row was found, so response
   timing does not reveal whether an account exists. Every failure returns the
   same generic message.
6. **Session row.** On success, `createSession()` generates a fresh UUID, writes
   a row into `admin_sessions` (admin id, expiry 12 hours from now, hashed IP,
   user agent) and updates `last_login_at`. A new id every time means a cookie
   value that existed before sign-in can never become an authenticated one.
7. **Signed cookie (jose JWT).** The same function signs an HS256 JWT with
   `AUTH_SECRET`, where `sub` is the admin id and `jti` is the session row id.
   That token is set as the `mivo_session` cookie: `HttpOnly`, `SameSite=Lax`,
   `Path=/`, and `Secure` in production. `HttpOnly` means page JavaScript cannot
   read it.
8. **Edge check (`src/proxy.ts`).** On every request to `/admin`, `/admin/*` or
   `/api/admin/*`, the proxy checks whether the cookie is present at all. No
   cookie: admin pages redirect to `/admin/login`, admin APIs return `401`. This
   runs before any admin page renders, so unauthenticated traffic never reaches
   the dashboard code. It does **not** verify the signature — the Edge runtime
   has no database access, so a cookie could be faked at this layer.
9. **Server check (`requireSession()`).** This is the real gate. Every admin
   page (via the dashboard layout), every Server Action and every protected
   route handler calls `requireSession()` or `getSession()`, which:
   - verifies the JWT signature and expiry with `AUTH_SECRET`;
   - looks up `admin_sessions` by id and admin id, requiring `revoked_at IS
     NULL` and `expires_at > now()`;
   - joins `admins` and re-checks the email still equals `ADMIN_EMAIL`.

   Any of those failing means no session, which means a redirect to
   `/admin/login` (or a `401` from an API route).
10. **Sign out.** `signOut()` sets `revoked_at` on the session row *and* deletes
    the cookie. Because step 9 checks the row every time, a copied cookie is
    dead the moment you sign out.

The short version: the cookie proves *who signed the token*, the database row
proves *the session is still allowed*. You need both, on every request.

### Files involved

| File | Role |
|------|------|
| `src/lib/env.ts` | Reads environment variables. Server-only. |
| `src/lib/auth.ts` | Password verify, session create / read / revoke |
| `src/lib/db.ts` | Postgres access via `@neondatabase/serverless` |
| `src/lib/rate-limit.ts` | Login and public-endpoint limits |
| `src/lib/audit.ts` | Writes the `audit_log` trail |
| `src/proxy.ts` | Edge cookie check for `/admin` and `/api/admin` |
| `src/app/admin/login/actions.ts` | The `signIn` Server Action |
| `src/app/admin/(dashboard)/layout.tsx` | Calls `requireSession()` for every dashboard page |
| `db/schema.sql` | Tables, including `admins` and `admin_sessions` |
| `scripts/hash-password.mjs` | Generates the bcrypt hash |
| `scripts/db-setup.mjs` | Applies the schema and upserts the owner row |

## Where secrets belong

Secrets live in environment variables and nowhere else.

- **Locally:** `.env.local`. It is listed in `.gitignore` and must stay
  untracked. `.env.example` is the committed template and holds variable names
  with empty values only.
- **In production:** the hosting provider's environment variables (Vercel
  project settings). Mark the sensitive ones as sensitive so they cannot be read
  back out of the dashboard afterwards.
- **Never** prefix a secret with `NEXT_PUBLIC_`. That prefix inlines the value
  into the JavaScript bundle sent to every visitor's browser. The only
  `NEXT_PUBLIC_` variable here is `NEXT_PUBLIC_SITE_URL`, which is just the
  public address of the site.
- **Never** commit a secret, paste one into a client component, put one in a
  screenshot, or send one over chat or email. If one does get committed, treat
  it as burned and rotate it — deleting the commit is not enough.
- The admin settings page shows variable **names** and whether they are set. It
  never displays a value, and it should stay that way.

The variables the app reads (see `.env.example` for the authoritative list):

| Variable | Required | What it is |
|----------|----------|------------|
| `DATABASE_URL` | Yes, for the admin area | Postgres connection string |
| `AUTH_SECRET` | Yes, for the admin area | Signing key for session cookies |
| `ADMIN_EMAIL` | Yes, for the admin area | The one address allowed to sign in |
| `ADMIN_PASSWORD_HASH` | Yes, for the admin area | bcrypt hash of your password |
| `RESEND_API_KEY` | Optional | Resend key for enquiry notification email |
| `EMAIL_FROM` | Optional | Verified sender address |
| `EMAIL_TO` | Optional | Where enquiry notifications are delivered |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public base URL. Safe to expose. |
| `IP_HASH_SALT` | Optional | Salt used to hash visitor IPs before storing them |

The public marketing site runs fine with none of these set. Only the admin area
needs them.

## Local development setup

```bash
npm install
cp .env.example .env.local
```

Then fill in `.env.local`:

```bash
# 1. A signing key for session cookies
openssl rand -base64 48

# 2. A salt for hashing visitor IPs
openssl rand -base64 32

# 3. A bcrypt hash of the password you want to use
npm run admin:hash
```

Paste each generated value into the matching variable in `.env.local`, and set
`ADMIN_EMAIL` to the address you will sign in with. Add a `DATABASE_URL` for a
Postgres database you are happy to develop against — a free Neon database is
fine, and it should not be the same one production uses.

Then:

```bash
npm run db:setup   # applies db/schema.sql and creates the owner row
npm run dev        # http://localhost:3000
```

Sign in at `http://localhost:3000/admin/login`.

If you skip `DATABASE_URL`, the public site still works. The admin area will
tell you sign-in is unavailable, which is the correct behaviour rather than a
crash.

## Production setup on Vercel

1. Connect the repository to a Vercel project. The build command is the default
   (`npm run build`); there is nothing custom to configure.
2. Add the environment variables under **Settings → Environment Variables** for
   the **Production** environment:
   - `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`
   - optionally `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `IP_HASH_SALT`
   - `NEXT_PUBLIC_SITE_URL` set to your live domain
3. Mark `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD_HASH` and
   `RESEND_API_KEY` as **sensitive**.
4. Use a **different** `AUTH_SECRET` in production from the one you use locally,
   and ideally a different database.
5. Apply the schema to the production database and create the owner row. Either
   paste `db/schema.sql` into your database provider's SQL console, or run the
   setup script from your machine with the production values passed in for that
   one command:

   ```bash
   DATABASE_URL='paste-the-production-connection-string' \
   ADMIN_EMAIL='you@yourdomain.com' \
   ADMIN_PASSWORD_HASH='paste-the-bcrypt-hash' \
     npm run db:setup
   ```

   Values passed this way take precedence over `.env.local`. Be aware they land
   in your shell history — clear the entry afterwards, or export them in a
   subshell you then close.
6. Redeploy. Environment variable changes only take effect on a new deployment.
7. Visit `/admin/settings` once you are signed in and check the configuration
   table shows everything you expect as **Set**.

## Database setup

`db/schema.sql` is the whole schema: `admins`, `admin_sessions`, `enquiries`,
`enquiry_notes`, `projects`, `analytics_events`, `audit_log` and
`rate_limit_hits`. Every statement is idempotent, so re-running is safe and is
the normal way to apply a change.

```bash
npm run db:setup
```

The script reads `.env.local` automatically, applies the schema statement by
statement, then upserts the owner account. It refuses to continue if
`ADMIN_PASSWORD_HASH` does not look like a bcrypt hash, which catches the
mistake of pasting the plaintext password by accident.

## Creating the first owner account

```bash
npm run admin:hash
```

You will be prompted for the password twice; it is not echoed and does not end
up in your shell history. Minimum length is 12 characters. Only the hash is
printed.

1. Copy the hash into `ADMIN_PASSWORD_HASH`.
2. Set `ADMIN_EMAIL` to your address.
3. Run `npm run db:setup`.
4. Sign in at `/admin/login`.

Use a long, unique password and store it in a password manager. There is no
password reset email — recovery means generating a new hash and re-running the
setup script, so losing the password is inconvenient but not fatal.

## Revoking access

Pick the smallest hammer that does the job.

| Situation | What to do |
|-----------|------------|
| Finished working on this device | **Sign out** in the sidebar. Revokes this session server-side. |
| Lost a laptop or phone | **Sign out everywhere** on `/admin/settings`. Revokes every active session. |
| Want to be certain, from the database | `UPDATE admin_sessions SET revoked_at = now() WHERE revoked_at IS NULL;` |
| Suspect the signing key is compromised | Rotate `AUTH_SECRET` and redeploy. Every existing cookie fails signature verification, so all sessions die at once. |
| Changing your password | `npm run admin:hash` then `npm run db:setup`. The setup script revokes all live sessions as part of the rotation. |

Deleting session rows outright works too (`DELETE FROM admin_sessions ...`);
setting `revoked_at` just leaves a record that it happened.

## Rotating secrets

Do this on a schedule, and immediately if a value has ever been pasted somewhere
it should not have been.

- **Password:** `npm run admin:hash` → update `ADMIN_PASSWORD_HASH` locally and
  in Vercel → `npm run db:setup` against each database → redeploy.
- **`AUTH_SECRET`:** generate a new one with `openssl rand -base64 48`, update
  it, redeploy. Expect to sign in again — that is the point.
- **`DATABASE_URL`:** rotate the credential in your database provider, update
  the variable, redeploy. Old connection strings stop working.
- **`RESEND_API_KEY`:** create a new key in Resend, update the variable,
  redeploy, then delete the old key from Resend.
- **`IP_HASH_SALT`:** safe to rotate; existing hashes simply stop matching new
  ones, which only affects rate-limit buckets.

After any rotation, redeploy and sign in once to confirm it worked.

## How to test authentication

```bash
npm run typecheck                             # tsc --noEmit
npm run lint                                  # eslint .
npm run test:unit                             # validation unit tests
node --test tests/access-control.test.mjs     # live HTTP access-control checks
npm test                                      # compiles test fixtures, runs everything
npm run build                                 # production build
```

`tests/access-control.test.mjs` starts a real production server on port 3987 and
makes real unauthenticated requests. It checks that `/admin` and every subpage
redirect to the login page, that `/api/admin/*` returns `401`, that a forged
cookie and a correctly signed cookie with no matching session row are both
refused, that the public HTML and JavaScript bundles contain no secrets, that
the enquiry API is write-only, and that the security headers and `robots.txt`
rules are in place. If the server cannot start, the suite fails and prints the
server's own error output — it never skips quietly.

It does **not** connect to a real database. `DATABASE_URL` is deliberately
pointed at an unreachable address so the session lookup has to fail closed, so
the suite proves nobody gets in but does not prove that *you* can. Check the
signed-in path by hand after any auth change:

- [ ] Sign in with the correct email and password — you land on `/admin`.
- [ ] Wrong password gives the same generic message as an unknown email.
- [ ] Sign out, then press the browser back button — you get the login page, not
      a cached dashboard.
- [ ] Sign in on two browsers, use **Sign out everywhere**, confirm both are out.
- [ ] `/admin/settings` shows the config table with the values you expect.

## Troubleshooting

**"Admin sign-in is not available yet. Check the server configuration."**
One of `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` is
missing or empty, or the database could not be reached. Check the server logs
and `/admin/settings` if you can still get in from another session. In
production, remember that environment variable changes need a redeploy.

**Sign-in always fails with the generic message.**
Usually the hash. Confirm `ADMIN_PASSWORD_HASH` starts with `$2` and was copied
in full, with no line break or trailing space. Then confirm you ran
`npm run db:setup` *after* setting it — the app compares against the hash stored
in the `admins` table, so an updated variable with a stale row will not match.
Also check `ADMIN_EMAIL` matches the address you are typing; comparison is
case-insensitive but a different address will not work.

**Sign-in appears to succeed, then bounces straight back to the login page.**
The cookie was set but `getSession()` refused it. Likely causes, in order:
`AUTH_SECRET` differs between the machine that issued the cookie and the one
serving the request (for example a local cookie against a production build); the
session row was revoked or has expired; the database is unreachable, in which
case the check fails closed on purpose; or `ADMIN_EMAIL` was changed after the
row was created so the email re-check fails. Clear the `mivo_session` cookie and
try once more, then check the server logs for `[auth] session lookup failed`.

**Enquiry notification emails are not arriving.**
Email is optional and failures are logged rather than surfaced to the visitor,
so check the server logs for `[email]` lines. All three of `RESEND_API_KEY`,
`EMAIL_FROM` and `EMAIL_TO` must be set — `/admin/settings` shows which are
missing. `EMAIL_FROM` has to be an address on a domain you have verified in
Resend. Enquiries are still stored in the database when email fails.

**Enquiries return an error on the live site.**
With neither `DATABASE_URL` nor a working email setup there is nowhere for a
submission to go, so the API returns an error in production rather than
pretending to have accepted it. Look for `[enquiries] no delivery sink
configured` in the logs.

**The access-control test says the port is already in use.**
A server from an earlier run is still listening. Find and stop it
(`lsof -nP -iTCP:3987 -sTCP:LISTEN`), or run the suite on another port with
`ACCESS_CONTROL_TEST_PORT=4001 node --test tests/access-control.test.mjs`.

**The access-control test says the server returned 500 for every request.**
The build output in `.next` is missing or half-written. Run `npm run build` and
try again.
