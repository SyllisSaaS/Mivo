# Client Process

A practical guide for handling Mivo project enquiries from first contact to launch.

## 1. Receive enquiry

- Enquiry arrives via the website quote form (email) or direct message
- Acknowledge within 1–2 working days
- Save the enquiry details — copy into a new client folder if proceeding

## 2. Review requirements

Read through what the client sent:

- Contact details and business context
- Project type and goals
- Existing website, branding, content
- Features, deadline, budget

If information is missing, ask clarifying questions before quoting.

## 3. Classify the project

Every enquiry gets a colour classification **before** you commit:

### GREEN — Straightforward

Within your current capability. Examples:

- Marketing / landing pages
- Small business websites (2–10 pages)
- Portfolio sites
- Responsive layouts
- Contact forms, galleries, social links
- Maps, third-party booking embeds
- Simple integrations

**Action:** Proceed to scope and quote.

### YELLOW — Needs investigation

Technically possible but you need to research before committing. Examples:

- E-commerce with specific platform requirements
- Custom booking flows (via third-party)
- Multiple integrations
- Unfamiliar tech stack
- Tight deadline with unclear scope

**Action:** Research, ask questions, give an honest timeline estimate. Quote with caveats or decline if too risky.

### RED — Outside current capability

Too complex for where you are now. Examples:

- User account systems / login portals
- Advanced dashboards
- Subscriptions and recurring billing
- Complex custom payment systems
- Large databases / SaaS applications
- Highly custom booking platforms
- Complicated API integrations

**Action:** Decline politely OR refer elsewhere. Do not promise you can deliver.

See `custom-project-safety.md` for more detail.

## 4. Determine scope

Document in `requirements.md`:

- Pages and structure
- Features (in scope / out of scope)
- Design approach
- Content responsibility (client vs you)
- Revisions included (e.g. 2 rounds)
- Timeline

## 5. Estimate development effort

Break the work into chunks:

| Task | Hours estimate |
|------|----------------|
| Design / layout | |
| Development | |
| Content integration | |
| Testing | |
| Revisions buffer | |
| **Total** | |

Be conservative. Add buffer for your experience level.

## 6. Decide quote

- Calculate price based on your rate and estimated hours
- Do not expose internal pricing logic to the client
- Present a clear fixed price or range
- Specify what's included and excluded

## 7. Send proposal

Include:

- Summary of what they'll receive
- Pages and features included
- Timeline
- Price and payment terms
- Revision policy
- What you need from them (content, branding, feedback deadlines)

## 8. Collect deposit

- Standard: 50% deposit before work starts
- Adjust based on project size and trust
- Do not start development without agreement + deposit (for paid work)

## 9. Start project

- Duplicate `projects/client-project-template/`
- Fill in `project-info.md` and `requirements.md`
- Set up development environment in the client folder
- Share progress checkpoints with the client

## 10. Client review

- Share preview link (staging / Vercel preview)
- Give clear feedback deadline
- Log feedback in `client-feedback/`

## 11. Revisions

- Complete agreed revision rounds
- Log changes in `revisions/`
- Out-of-scope requests → new quote or add to maintenance

## 12. Final payment

- Collect remaining balance before launch (or as agreed)
- Confirm all revision rounds are complete

## 13. Launch

- Final cross-device testing
- DNS / domain setup
- Go live
- Document in `launch/launch-checklist.md`

## 14. Optional maintenance

- Agree ongoing support if needed
- Document in `maintenance/`
- Small updates, fixes, content changes

## 15. Testimonial / case study

- Ask the client if they're happy to be featured
- Only add to portfolio with permission
- Label correctly as **Client project**
- Never fabricate testimonials or results

---

## Quick reference

| Stage | Client sees | You do internally |
|-------|-------------|-------------------|
| Enquiry | Quote form | Classify GREEN/YELLOW/RED |
| Quote | Proposal email | Scope + estimate |
| Build | Preview links | Develop in `projects/` |
| Launch | Live site | Deploy + document |
| After | Support (if agreed) | Maintenance notes |
