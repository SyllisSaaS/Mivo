# Client Projects

This folder contains **external client work** — completely separate from the public Mivo website.

## Rules

- Each client gets their own folder inside `projects/`
- Never import client code into the Mivo public site
- Never commit client secrets, credentials or `.env` files
- Use the template below for every new project

## New client onboarding checklist

- [ ] Duplicate `client-project-template/` → `projects/client-name/`
- [ ] Fill in `project-info.md` (client name, contact, dates)
- [ ] Complete `requirements.md` with the client
- [ ] Add assets to `assets/` (logos, images, brand files)
- [ ] Save design references in `design-references/`
- [ ] Document deployment details in `deployment/`
- [ ] Track feedback in `client-feedback/` and revisions in `revisions/`
- [ ] Record launch details in `launch/`
- [ ] Add maintenance notes to `maintenance/` if applicable
- [ ] Follow `docs/business/client-process.md` for quoting and delivery

## Folder structure

```
projects/
├── README.md                    ← this file
├── client-project-template/     ← duplicate this for new clients
└── [client-name]/               ← one folder per client
```

Do not create fake client projects. Only add folders when you have a real enquiry or signed project.
