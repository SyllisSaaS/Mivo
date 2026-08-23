# Development Guide

Notes for working on the Mivo codebase. Project layout and commands are in the
[root README](../../README.md); admin setup is in
[`docs/admin/README.md`](../admin/README.md).

## Stack

- **Next.js 16** (App Router) — Server Components by default
- **TypeScript** in strict mode
- **Plain CSS** with custom properties — `src/app/globals.css` for the public
  site, `src/app/admin/admin.css` for the dashboard. No CSS framework.
- **Postgres** via the Neon serverless driver

Dependencies are deliberately few: `jose` (session tokens), `bcryptjs`
(password hashing), `@neondatabase/serverless` (database), `resend` (email).
Each earns its place. Prefer solving something with the framework before adding
a package.

## Server and client components

Everything is a Server Component unless it genuinely needs the browser. The
Client Components are `SiteNav`, `QuoteForm`, `ScrollReveal`, `Analytics`,
`AdminSidebar`, `LoginForm` and `ConfirmSubmit` — navigation state, form state
and observers.

Two rules that matter:

- **Never import `src/lib/*` into a Client Component.** Those modules read
  environment variables and talk to the database. `env.ts` in a client bundle
  would be a secret leak.
- **Mutations are Server Actions**, not API routes. Next.js verifies the request
  origin for Server Actions, which covers CSRF without a hand-rolled token.

## Where things live

| Task | File |
| --- | --- |
| Homepage content | `src/app/page.tsx` |
| Public styles | `src/app/globals.css` |
| Portfolio projects | `src/data/portfolio.ts` |
| Quote form fields | `src/components/site/QuoteForm.tsx` + `src/lib/validation.ts` |
| Statuses, budgets, project types | `src/lib/constants.ts` |
| Dashboard styles | `src/app/admin/admin.css` |
| Reusable dashboard UI | `src/components/admin/ui.tsx` |

## Changing the quote form

A new field touches four places, in this order:

1. `db/schema.sql` — the column (then `npm run db:setup`)
2. `src/lib/constants.ts` — allowed values, if it is a choice field
3. `src/lib/validation.ts` — server-side validation and length cap
4. `src/components/site/QuoteForm.tsx` — the input
5. `src/lib/enquiries.ts` — the insert and the read

Client-side validation is for UX only. The server revalidates everything; treat
anything from the browser as untrusted.

## Adding a portfolio project

Append to `portfolioProjects` in `src/data/portfolio.ts` and add a matching
preview rule in `globals.css`:

```css
.preview-yourproject {
  background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
}
```

Keep `type` honest — `client`, `personal` or `concept`. The badge is rendered on
every card and cannot be hidden.

## Content rules

Do not invent testimonials, client counts, statistics, awards, partnerships or
years of experience. If a section needs content that does not exist yet, use an
honest placeholder or leave it out. The site has to look professional without
claiming anything untrue, because a prospective client can check.

## Accessibility checklist

Before shipping a UI change:

- [ ] Semantic landmarks (`header`, `main`, `nav`, `footer`)
- [ ] Skip link still reaches main content
- [ ] Form inputs have real labels; errors are associated with their field
- [ ] `aria-expanded` on the mobile menu and the sidebar toggle
- [ ] Keyboard-only pass: everything reachable, focus always visible
- [ ] Contrast holds up, including muted text on dark panels
- [ ] `prefers-reduced-motion` respected — reveal animations are skipped
- [ ] Charts are not the only way to read a number (the admin charts have table
      fallbacks for this reason)

## Performance notes

- Fonts are self-hosted through `next/font` — no external request, no layout
  shift, and it keeps the CSP strict
- No animation library; reveals use `IntersectionObserver` and CSS transitions
- Admin lists are paginated and filtered in SQL — never fetch every enquiry to
  filter in the browser
- Fetch only the columns a view needs

## Testing

```bash
npm run typecheck
npm run lint
npm test
```

`tests/validation.test.mjs` covers the public form rules. It runs against
compiled output, so `npm run test:build` (part of `npm test`) has to run first.

`tests/access-control.test.mjs` starts a real production server and asserts the
private area is closed. Run it after touching `src/lib/auth.ts`, `src/proxy.ts`,
`next.config.ts` or anything under `src/app/admin/`.

## Before committing

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm test` passing
- [ ] No secret, connection string or password in the diff
- [ ] No `console.log` left in a client component
- [ ] Mobile layout checked — no horizontal overflow
