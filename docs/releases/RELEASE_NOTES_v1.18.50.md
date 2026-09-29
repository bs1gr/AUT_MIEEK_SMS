# Release Notes - Version 1.18.50

**Release Date**: 2026-09-29
**Previous Version**: v1.18.49

## ✨ Features

- **auth**: self-registration needs admin approval; activation emails the user [434631c]

## 🐛 Bug Fixes

- E2E runs used the real mail relay; first-login password dialog was English in Greek [73e6ebe]
- **ci**: Dependabot merges via GitHub App token; dependabot.yml was invalid [b8a8edd]
- **ci**: Dependabot auto-merge failed - token lacked contents: write [5affca4]
- **ci**: COMMIT_READY translation check broke under Vitest 4; drop bare PR Hygiene job [9e1f067]
- **scripts**: state snapshot pointed at pre-flatten paths [fd22d8d]
- **tests**: CI failures after registration approval (434631cbc) [44b9930]

## 📝 Documentation

- **plan**: record registration approval + CI fix (434631cbc, 44b993081) [0c8d13b]
- **plan**: record v1.18.49 release [b3426e3]

## 🧹 Chores

- **ci**: finish ruleset migration - remove nightly branch-protection job [a89e5c4]
- **ci**: protection moved to rulesets; drop nightly classic re-apply [3efaa10]
- **deps**: bump fast-uri from 3.1.6 to 3.1.8 in /src/frontend (#230) [6189bbf]

---

### 📊 Statistics

- **Total Commits**: 12
- **Contributors**: 2


