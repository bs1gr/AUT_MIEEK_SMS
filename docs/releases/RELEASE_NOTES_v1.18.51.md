# Release Notes - Version 1.18.51

**Release Date**: 2026-10-06
**Previous Version**: v1.18.50

## ✨ Features

- **students**: predictions panel on the Student Profile, end to end [c275194]
- **students**: filter and sort by class division and academic year [dcab3bf]

## 🐛 Bug Fixes

- **ui**: rounded corners and the body text styles finally apply; drop dead GradeDisplay [3fb9eef]
- **students**: Academic Year dropdown asked for "a student and course" [9acb56c]
- **security**: Capacitor 7.6.9 and patched seroval (two critical advisories) [3af07f9]
- **docker**: never merge a host's own SQLite into a PostgreSQL in use [1b6d5f1]
- **security**: predictive analytics never returns exception text [fff67a6]
- **ci**: Native DeepClean Safety looked for NATIVE.ps1 at the repo root [813da3c]
- **db**: show which database a server uses; migration tool no longer truncates by default [bbba7ec]
- **db**: Lite never runs on a local DB when set up for QNAP; QNAP outage queues changes [10c841c]
- **i18n**: Greek UI showed English/raw keys; delete code that never rendered [e80a3e3]
- **api**: meta.version comes from the VERSION file [330615c]
- **security**: SMTP override never persists a plaintext password [9631830]
- **security**: encrypt persisted SMTP password [3a8fd1f]
- **security**: upgrade virtualenv to patched release [a8548d3]
- **security**: patch root brace-expansion dependency [bbc3893]
- **security**: sync npm lock and patch virtualenv [b42b6c1]
- **security**: update PyJWT and brace-expansion [b319e67]
- **attendance**: filter courses and allow selective scoring [0e80d05]

## ♻️ Refactoring

- **export-admin**: keep only the email-settings hooks and types [bb8190f]

## 📝 Documentation

- **plan**: record v1.18.50 release [1ddf837]

## 🔨 Build System

- **frontend**: Tailwind CSS 4 and @vitest/eslint-plugin, rendering unchanged [3ba0d7c]

## 🤖 CI/CD

- bump source-map-js from 1.2.1 to 1.2.2 (#256) [5269ce5]
- bump actions/dependency-review-action from 4 to 5 (#235) [eaaab65]
- bump actions/setup-dotnet from 4 to 6 (#234) [e11512a]
- bump aquasecurity/trivy-action from 0.35.0 to 0.36.0 (#233) [8c2aa20]
- bump docker/setup-buildx-action from 3 to 4 (#232) [56f0a52]
- bump actions/cache from 5 to 6 (#231) [9f97c85]

## 🧹 Chores

- **frontend**: delete three more pieces of code that never ran [4d8cdda]

## 📦 Other Changes

- deps: patch three dev-only advisories with overrides (smol-toml, katex, postcss-selector-parser) [4707541]
- deps: take the remaining Dependabot updates (#245 #244 #242 #240 #239 #237) [7a63651]
- deps: bump the npm-minor-patch group across 1 directory with 177 updates (#255) [e9ab367]
- deps: bump the pip-minor-patch group across 1 directory with 33 updates (#253) [21ecc2c]

---

### 📊 Statistics

- **Total Commits**: 33
- **Contributors**: 2


