# Mivo Development Workspace

Mivo is a web design and development studio run by Oliver. This repository is the central workspace for:

1. **The public Mivo website** — portfolio, services, and project enquiries
2. **Internal documentation** — business process, development guides
3. **Client projects** — isolated folders for external client work

## Quick start

The Mivo site is a static HTML/CSS/JS site. No build step required.

**Preview locally:**

```bash
# Option 1 — open directly
open index.html

# Option 2 — local server (recommended)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Project structure

```
mivo-development/
├── index.html          # Mivo public website
├── css/styles.css      # Site styles
├── js/
│   ├── main.js         # Navigation, scroll, animations
│   ├── portfolio.js    # Portfolio data + rendering
│   └── form.js         # Quote form logic
├── assets/             # Images, favicon, etc.
├── docs/               # Internal documentation
├── projects/           # Client project folders
└── README.md           # This file
```

## Adding a portfolio project

Edit `js/portfolio.js` and add an entry to `PORTFOLIO_PROJECTS`:

```javascript
{
  slug: "project-name",
  name: "Project Name",
  type: "client",        // "client" | "personal" | "concept"
  category: "Business website",
  description: "Short description.",
  technologies: ["HTML", "CSS"],
  liveUrl: "https://example.com",  // optional
  previewClass: "preview-custom",  // add CSS in styles.css
  previewLabel: "PROJECT",
  featured: true,
  large: false,
}
```

**Never label a concept or personal project as a paid client.**

## Creating a new client project

1. Duplicate `projects/client-project-template/` to `projects/client-name/`
2. Fill in `project-info.md` and `requirements.md`
3. Keep all client work inside that folder — do not mix with the Mivo site
4. Follow the process in `docs/business/client-process.md`

See `projects/README.md` for the full onboarding checklist.

## Deploying the Mivo site

The site can be deployed to any static host:

- **GitHub Pages** — push to `main`, enable Pages on the repo
- **Netlify** — connect repo, publish directory is root
- **Vercel** — connect repo, no build command needed

Update the canonical URL in `index.html` when your domain is live.

## Environment variables

None required for the static site. If you connect the quote form to a service later (Formspree, Netlify Forms, etc.), add credentials via your host's environment settings — never commit secrets.

## Important commands

| Task | Command |
|------|---------|
| Local preview | `python3 -m http.server 8080` |
| Edit portfolio | `js/portfolio.js` |
| Edit quote email | `js/form.js` → `QUOTE_EMAIL` |

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/business/client-process.md` | How to handle enquiries and quotes |
| `docs/business/custom-project-safety.md` | Assessing custom requests |
| `docs/client-process/requirements-template.md` | Project requirements template |
| `docs/development/getting-started.md` | Development notes |

## Git remote

GitHub: [github.com/SyllisSaaS/Mivo](https://github.com/SyllisSaaS/Mivo)

To connect this local repo:

```bash
git remote add origin https://github.com/SyllisSaaS/Mivo.git
```
