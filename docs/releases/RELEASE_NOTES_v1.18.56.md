# Release Notes - Version 1.18.56

**Release Date**: 2026-10-13
**Previous Version**: v1.18.55

## 🐛 Bug Fixes

- **users**: tell registration requests from deactivated accounts; one password rule [ad93fa6]

## ♻️ Refactoring

- **models**: stop mapping the four unused extended-absence columns [95cbcba]

## 📝 Documentation

- the public QNAP database port is closed; use the LAN address or Tailscale [efa923b]
- **plan**: record the v1.18.55 release, the Dependabot round and the public QNAP port [0309209]

## 🤖 CI/CD

- bump actions/labeler from 5 to 7 (#262) [9ab76e9]
- bump docker/build-push-action from 5 to 7 (#261) [baa1a8f]
- bump actions/checkout from 5 to 7 (#260) [02110af]
- bump docker/login-action from 3 to 4 (#259) [1d77d7a]
- bump actions/github-script from 7 to 9 (#258) [82b8555]

## 📦 Other Changes

- deps: bump @babel/plugin-transform-regexp-modifiers in /src/frontend (#272) [b631fb3]
- deps: bump @babel/plugin-transform-destructuring in /src/frontend (#270) [1bacada]
- deps: bump @babel/plugin-transform-class-properties in /src/frontend (#269) [dd57044]
- deps: update orjson requirement in /src/backend (#267) [8138813]
- deps: bump the npm-minor-patch group in /src/frontend with 58 updates (#268) [263e048]
- deps: update keras requirement from >=3.13.1 to >=3.15.1 in /src/backend (#266) [769d097]
- deps: update pypdf requirement from >=6.19.0 to >=6.20.0 in /src/backend (#264) [8ec8a54]
- deps(backend): OpenTelemetry 1.45.1/0.66b1 as one family, plus the pip minor/patch group [e4f01de]

---

### 📊 Statistics

- **Total Commits**: 17
- **Contributors**: 2


