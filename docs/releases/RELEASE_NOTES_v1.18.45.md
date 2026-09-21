# Release Notes - Version 1.18.45

**Release Date**: 2026-09-21
**Previous Version**: v1.18.44

## 🐛 Bug Fixes

- **lite**: bundle the semester archive router in SMS_Lite and stop masking import errors [9aa9c06]
- **security**: confine restore and SPA static paths with realpath+startswith [906f4a0]
- **security**: place CodeQL path-injection suppressions on the sink line [3025270]

## ⚡ Performance

- **grading**: fetch a student's courses with one request, not one per course [220727a]

## 🤖 CI/CD

- **test**: run restore round-trip tests against a Postgres service; drop stale E2E spec [66179b8]

---

### 📊 Statistics

- **Total Commits**: 5
- **Contributors**: 1


