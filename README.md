# Mivo Development Workspace

Mivo is a web design and development studio run by Oliver. This repository is
the central workspace for:

1. **The public Mivo website** — portfolio, services and project enquiries
2. **A private admin dashboard** — enquiries, projects and internal analytics
3. **Internal documentation** — business process and development guides
4. **Client projects** — isolated folders for external client work

**Stack:** Next.js 16 (App Router) · TypeScript · Postgres · deployed on Vercel.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The public site runs with no configuration at all. The admin area needs a
database and a few environment variables — see
[`docs/admin/README.md`](docs/admin/README.md). Until those are set, `/admin` is
unavailable and the enquiry form validates but reports a friendly error instead
of saving. That is deliberate: the marketing site works on its own.

```bash
cp .env.example .env.local     # then fill in what you need
```

---

## Project structure

```
mivo-development/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Public homepage
│   │   ├── layout.tsx          # Root layout, metadata, fonts
│   │   ├── globals.css         # Public site styles
│   │   ├── admin/              # PRIVATE dashboard (auth required)
│   │   │   ├── login/
│   │   │   └── (dashboard)/    # Overview, enquiries, analytics, projects, settings
│   │   └── api/
│   │       ├── enquiries/      # Public: create an enquiry (write-only)
│   │       ├── analytics/      # Public: anonymous events
│   │       └── admin/          # Private: CSV exports
│   ├── components/
│   │   ├── site/               # Public site components
│   │   └── admin/              # Reusable dashboard components
│   ├── data/portfolio.ts       # Portfolio projects
│   ├── lib/                    # Server-side logic (see below)
│   └── proxy.ts                # Edge guard for /admin
├── db/schema.sql               # Database schema
├── scripts/                    # Password hashing, database setup
├── tests/                      # Unit + access-control tests
├── docs/                       # Internal documentation
└── projects/                   # Client project folders
```

The public and private sides are separated by route: everything under
`src/app/admin/` and `src/app/api/admin/` requires an authenticated session,
enforced server-side. Nothing else does.

### The `src/lib` layer

All server-side logic lives here and is never imported by a Client Component.

| Module | Purpose |
| --- | --- |
| `env.ts` | Reads environment variables; reports what is configured |
| `db.ts` | Postgres client and parameterised queries |
| `auth.ts` | Owner-only sign-in, sessions, `requireSession()` |
| `validation.ts` | Server-side validation of the public form |
| `enquiries.ts` / `projects.ts` | Data access |
| `metrics.ts` | Dashboard and analytics aggregation |
| `rate-limit.ts` | Login and form rate limiting |
| `email.ts` | New-enquiry notifications |
| `audit.ts` | Admin action log |
| `constants.ts` | Statuses, project types, budgets, lead sources |
| `request.ts` | Client IP hashing (raw IPs are never stored) |

`constants.ts` is the single source of truth for allowed values. Changing a
status list there updates the forms, the filters and the validation together.

---

## Adding a portfolio project

Append an entry to `portfolioProjects` in `src/data/portfolio.ts`. No components
need changing.

```typescript
{
  slug: "project-name",
  name: "Project Name",
  type: "client",              // "client" | "personal" | "concept"
  category: "Business website",
  description: "Short description.",
  technologies: ["Next.js", "TypeScript"],
  liveUrl: "https://example.com",   // optional
  previewClass: "preview-custom",   // add a matching rule in globals.css
  previewLabel: "PROJECT",
  featured: true,
  large: false,
}
```

**`type` must be honest.** `client` means real paid work. A personal or concept
project labelled as client work is a lie a prospective client can check. Every
card renders its type as a visible badge for exactly that reason.

---

## Creating a new client project

1. Duplicate `projects/client-project-template/` to `projects/client-name/`
2. Fill in `project-info.md` and `requirements.md`
3. Keep all client work inside that folder — never mix it into the Mivo site
4. Follow the process in [`docs/business/client-process.md`](docs/business/client-process.md)
5. Add the project in `/admin/projects` so it appears in the pipeline

`projects/` is excluded from linting and is not part of the Next.js build, so
client work cannot break the Mivo site.

See [`projects/README.md`](projects/README.md) for the onboarding checklist.

---

## Deployment

Deployed on Vercel as a standard Next.js project — no build configuration
needed.

1. Import the repository into Vercel
2. Add the environment variables (Settings → Environment Variables)
3. Run `npm run db:setup` once against the production database
4. **Leave the production domain public**, but turn on Deployment Protection for
   **Preview** deployments — a preview otherwise exposes a working admin login
   on a URL that leaks into pull requests

Full walkthrough in [`docs/admin/README.md`](docs/admin/README.md).

---

## Environment variables

Names and generation commands are in `.env.example`. Never commit real values.

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Admin area | Postgres connection string |
| `AUTH_SECRET` | Admin area | Session signing key |
| `ADMIN_EMAIL` | Admin area | The single authorised account |
| `ADMIN_PASSWORD_HASH` | Admin area | bcrypt hash — `npm run admin:hash` |
| `RESEND_API_KEY` | Email notifications | Optional |
| `EMAIL_FROM` / `EMAIL_TO` | Email notifications | Optional |
| `IP_HASH_SALT` | Privacy | Salt for hashing visitor IPs |
| `NEXT_PUBLIC_SITE_URL` | Metadata, email links | **Public** — the only one |

`NEXT_PUBLIC_` values are compiled into the browser bundle. Never put a secret
behind that prefix.

---

## Important commands

| Task | Command |
| --- | --- |
| Development server | `npm run dev` |
| Production build | `npm run build` |
| Serve the build | `npm start` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| All tests | `npm test` |
| Generate a password hash | `npm run admin:hash` |
| Apply schema + create owner | `npm run db:setup` |

`npm test` runs the validation unit tests and an access-control suite that
starts a real production server and checks the private area is genuinely closed.
It builds the app first if needed, so allow a couple of minutes on a cold run.

---

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/admin/README.md`](docs/admin/README.md) | Admin setup, operations, troubleshooting |
| [`docs/admin/security.md`](docs/admin/security.md) | Security architecture and known limitations |
| [`docs/business/client-process.md`](docs/business/client-process.md) | Handling enquiries and quotes |
| [`docs/business/custom-project-safety.md`](docs/business/custom-project-safety.md) | Assessing custom requests before promising them |
| [`docs/client-process/requirements-template.md`](docs/client-process/requirements-template.md) | Project requirements template |
| [`docs/development/getting-started.md`](docs/development/getting-started.md) | Working on the codebase |

---

## Git remote

GitHub: [github.com/SyllisSaaS/Mivo](https://github.com/SyllisSaaS/Mivo)
