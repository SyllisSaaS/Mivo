# Development Guide

Notes for working on the Mivo codebase.

## Stack

- HTML5 (semantic markup)
- CSS3 (custom properties, grid, flexbox)
- Vanilla JavaScript (no framework)

## File responsibilities

| File | Purpose |
|------|---------|
| `index.html` | Page structure and content |
| `css/styles.css` | All styles |
| `js/main.js` | Nav, scroll effects, reveal animations |
| `js/portfolio.js` | Portfolio data array + rendering |
| `js/form.js` | Multi-step quote form + mailto submission |

## Adding portfolio projects

Edit `PORTFOLIO_PROJECTS` in `js/portfolio.js`. Add a preview class in CSS if needed:

```css
.preview-yourproject {
  background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
}
```

## Quote form

Currently submits via `mailto:` — opens the visitor's email client.

To connect a form service later (Formspree, Netlify Forms, etc.):

1. Replace the submit handler in `js/form.js`
2. Add any API keys via environment variables on your host
3. Never commit secrets to the repo

## Accessibility checklist

- [ ] Semantic HTML (`header`, `main`, `section`, `nav`, `footer`)
- [ ] Skip link to main content
- [ ] Form labels and required field indicators
- [ ] `aria-expanded` on mobile menu
- [ ] `:focus-visible` styles
- [ ] `prefers-reduced-motion` respected
- [ ] Sufficient colour contrast

## Performance

- System fonts + one Google Font (DM Sans)
- No heavy JS libraries
- SVG favicon
- Lazy-load images when portfolio includes screenshots

## Deployment

No build step. Deploy the root directory as static files.

Update `canonical` URL and `sitemap.xml` when domain is confirmed.
