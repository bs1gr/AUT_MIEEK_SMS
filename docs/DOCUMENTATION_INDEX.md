# Documentation Index

**Last Updated**: 2026-09-03
**Version**: 1.18.36 (kept in sync with the root `VERSION` file by `COMMIT_READY.ps1`'s doc-sync step; do not hand-edit this line)

This is the top-level entry point into `docs/`. It exists to get you to the right
section index quickly — it does not try to enumerate every document (that's each
section's job, and a flat list of hundreds of files goes stale the moment anyone
adds or moves one).

> **Note on history**: for what changed and when, use `CHANGELOG.md` (repo root)
> and `git log` — not this file. An earlier version of this index carried a large
> "Phase 1 / Phase 2 / Phase 3" narrative with dozens of links into archived,
> since-reorganized paths; most of those links were dead. That narrative has been
> removed rather than re-linked, since the project has moved past those phases and
> the history is fully preserved in git.

---

## 🗂️ Where things live

```text
docs/
├── admin/          RBAC & permission management (roles, matrix, endpoint audit)
├── api/            API contract, examples, RBAC-to-endpoint matrix
├── archive/        Superseded docs, kept for reference only — not current guidance
├── ci/             CI diagnostics and failure reports
├── deployment/     Deployment, operations, troubleshooting → start at deployment/INDEX.md
├── development/    Architecture, auth, testing, contributing → start at development/INDEX.md
├── features/       Per-feature technical notes (e.g. search)
├── guides/         Standalone how-to guides
├── maintenance/    Maintenance/cleanup procedures
├── misc/           Uncategorized — move to a specific folder once it's clear where it belongs
├── monitoring/     Monitoring & alerting
├── operations/     Installation, rebuild/fresh-deploy troubleshooting, Docker naming, emergency guide
├── plans/          Active planning — see plans/UNIFIED_WORK_PLAN.md
├── processes/      Release automation, security scanning, benchmarking process docs
├── reference/      Quick-reference sheets (auth, security, event system, Playwright)
├── releases/       Per-version release notes and manifests
├── reports/        Dated report-style docs, bucketed by month
├── security/       Security audit plans and summaries
├── sessions/       Session-specific records
├── testing/        Testing plans and checklists
├── training/        User/admin training materials (EN/EL)
├── troubleshooting/ Cross-cutting troubleshooting guides
└── user/           End-user guides → start at user/INDEX.md
```

## 🚦 Start here, by role

| I am a... | Start at |
|---|---|
| End user | [user/INDEX.md](user/INDEX.md) |
| Developer | [development/INDEX.md](development/INDEX.md) |
| Operator / DevOps | [deployment/INDEX.md](deployment/INDEX.md) |
| Admin (RBAC/permissions) | [admin/RBAC_ADMIN_GUIDE.md](admin/RBAC_ADMIN_GUIDE.md), [admin/PERMISSION_MANAGEMENT_GUIDE.md](admin/PERMISSION_MANAGEMENT_GUIDE.md) |

Each section `INDEX.md` is the authoritative, current list for that section — trust
it over anything enumerated here.

## 📌 Cross-cutting documents (used across multiple roles)

- **[README.md](../README.md)** - Project overview, quick start
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history (source of truth for "what shipped when")
- **[CLAUDE.md](../CLAUDE.md)** - Agent/AI-assistant working agreement for this repo (architecture, critical rules, release workflow)
- **[plans/UNIFIED_WORK_PLAN.md](plans/UNIFIED_WORK_PLAN.md)** - Active task list and release state
- **[development/ARCHITECTURE.md](development/ARCHITECTURE.md)** - System architecture overview
- **[ACADEMIC_PRESENTATION.md](ACADEMIC_PRESENTATION.md)** / **[ACADEMIC_PRESENTATION_EL.md](ACADEMIC_PRESENTATION_EL.md)** - Full technical monograph (EN/EL) for an academic/CS audience: architecture, grading engine, predictive analytics, RBAC, CI/CD, test evidence
- **[operations/INSTALLATION_GUIDE.md](operations/INSTALLATION_GUIDE.md)** - Step-by-step installation
- **[deployment/DEPLOY.md](deployment/DEPLOY.md)** - Deployment procedures (Docker + native)
- **[reference/SECURITY_GUIDE.md](reference/SECURITY_GUIDE.md)** - Security quick reference
- **[E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md)** - End-to-end (Playwright) testing guide

## 🌐 Greek-language guides

- **[user/ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md](user/ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md)** - Οδηγός γρήγορης εκκίνησης
- **[user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md](user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md)** - Πλήρες εγχειρίδιο χρήστη
- **[user/RBAC_GUIDE_EL.md](user/RBAC_GUIDE_EL.md)** - Οδηγός ρόλων & δικαιωμάτων

---

## 📝 Documentation Guidelines

### When to create new documentation

1. **New major feature** - a dedicated guide under the relevant section (`user/`, `development/`, `deployment/`, etc.), linked from that section's `INDEX.md`
2. **Breaking changes** - update `CHANGELOG.md` plus any affected guide
3. **Security fixes** - document in `CHANGELOG.md` (avoid sensitive exploit details)

**Do not create**: session summaries, status reports, progress trackers, or
"COMPLETE"/"DONE" snapshot docs — per this project's own working agreement
(`CLAUDE.md`), that content belongs in commit messages and `CHANGELOG.md`, and
these one-off files are exactly what silently accumulates and goes stale (this
file's own history is a case study — see the note at the top).

### When to update existing documentation

- Minor feature additions → update the relevant guide
- Bug fixes → `CHANGELOG.md`
- Configuration changes → the relevant deployment/operations guide
- A doc becomes deprecated → mark it deprecated in its section's `INDEX.md`, don't leave it silently stale

### When to remove documentation

- Information is outdated or superseded → remove it and update whatever pointed to it
- **Git history preserves everything removed** — that's what it's for; don't keep a document alive "just in case", and don't create an archive copy unless there's a specific reason people will need to find it without `git log`

---

## 🔗 Reporting a documentation problem

Found a broken link, stale claim, or missing doc? Open a GitHub issue labeled
`documentation` with: the document name, what's wrong, and (if known) where the
correct information actually lives.
