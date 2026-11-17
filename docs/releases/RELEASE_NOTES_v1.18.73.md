# Release Notes - Version 1.18.73

**Release Date**: 2026-11-17
**Previous Version**: v1.18.72

## ✨ Features

- **notifications**: a teacher is offered the form that sends a message (todo 59) (#417) [05d59a0]

## 🐛 Bug Fixes

- **search**: the Search page sorts, pages and filters, and finds a Greek name; the Students page says when its list could not be loaded (todo 60) (#416) [597d014]
- **server**: migrations.log goes to logs/, the N+1 detector counts per request, psutil is asked for names it knows (#412) [263cdca]
- **frontend**: notifications share one state, a text equal to its key is shown, the Absence limits table fits a phone (#411) [08a2503]
- **gate**: run the changed tests alone only when nothing but test files changed (#410) [625df78]
- **server**: one slow-query limit, a bounded profiler, diagnostics that answer with login on (#409) [7e8520f]

## 📝 Documentation

- **plan**: #416, #417 and #418 merged - the Search page, teachers and the send form, the deletions; CI ran 1,727 backend, 2,012 frontend and 76 E2E tests; todo 62 [30d49c9]
- **plan**: #414 and #415 merged - the notification guides, and ten more E2E tests; CI ran 1,674 backend, 1,995 frontend and 71 E2E tests [51f74f3]
- **notifications**: both guides say what the application does; another account's notification is refused with 403, not 500 (#414) [25d5053]
- **plan**: #413 merged - the tag waits for a build-only Docker run; CI ran 1,669 backend tests (36 new) [25f80d9]
- **plan**: #412 merged - three server fixes; CI ran 1,633 backend tests (24 new) [e85d627]
- **plan**: #411 merged - four fixes in the pages; CI ran 1,994 frontend tests (22 new) [c268b84]
- **plan**: the backup key is in a third place (done by the owner) [31280b8]
- **plan**: the cloud VM runs main since 2026-11-16 22:18 UTC; the owner stays on PostgreSQL 14.18 [e9ce448]
- **plan**: #410 merged; no newer PostgreSQL image runs on the NAS (the owner's test) [38d1111]
- **plan**: #409 merged - CI ran the suite on PostgreSQL 14.25 and the round trip on 16.16 [61f1ca0]
- **plan**: the monitoring check's email integration is assigned to it (shown by the owner) [5171123]
- **plan**: the owner confirmed the monitoring check - up, 1 hour / 1 hour, test mail received [6c501ce]
- **plan**: v1.18.72 released - assets verified, cloud host updated, the monitoring signal is live [e7b9084]

## ✅ Tests

- **e2e**: ten of the twenty tests that never ran now run; the Search page shows a course's name (todo 53) (#415) [7c1b89a]

## 🤖 CI/CD

- **release**: the tag waits for a build-only Docker run of its commit, amd64 and arm64 (todo 48) (#413) [dc7cd27]

## 🧹 Chores

- delete six E2E tests for things the application does not have, and four components that no page uses (todos 53 and 60) (#418) [ace62bc]

---

### 📊 Statistics

- **Total Commits**: 22
- **Contributors**: 2


