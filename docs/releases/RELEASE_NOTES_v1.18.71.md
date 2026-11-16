# Release Notes - Version 1.18.71

**Release Date**: 2026-11-16
**Previous Version**: v1.18.70

## ✨ Features

- **backup**: the app makes a daily backup itself, and a backup can be restored (#407) [214a5df]

## 🐛 Bug Fixes

- **tests**: the Alembic command-line test reads its child's output as UTF-8 (#404) [bbc2b2b]
- **gate**: the Markdown auto-fix no longer turns a PR number into a heading, unannounced (#395) [d45e69c]
- **tests**: a test run starts no scheduler and loads no saved mail settings (#392) [ea1edba]

## ⚡ Performance

- **rbac**: the permission layer no longer holds the event loop (#393) [5e1b43a]

## 📝 Documentation

- **plan**: the owner's answers of 2026-11-15 - attendance confirmed on the phone, no scheduled backup exists [2a1addc]
- **plan**: the E2E auto-start that cannot start a backend is recorded (todo 58); #394 and #395 named [3e92905]
- **plan**: the closed entries and older records move to an archive file (todo 57) (#394) [96b347d]
- **plan**: v1.18.70 released - assets, cloud host and shared database verified; #391 and #392 recorded [d4ba423]

## ⬆️ Dependencies

- bump the npm-minor-patch group across 1 directory with 88 updates (#403) [a0695a6]
- update pypdf requirement from >=6.21.4 to >=7.0.1 in /src/backend (#397) [3183df5]
- bump the pip-minor-patch group in /src/backend with 5 updates (#396) [5144e02]
- bump @babel/traverse from 7.29.13 to 7.29.14 in /src/frontend (#401) [add8fd2]
- bump @babel/parser from 7.29.13 to 7.29.14 in /src/frontend (#399) [bfee194]
- bump @babel/helper-wrap-function in /src/frontend (#402) [25e2b24]

## 🧹 Chores

- remove the direct @babel/runtime devDependency (#406) [401a56e]
- remove the direct @babel/core devDependency and the guard that added it (#405) [ff27a9e]
- remove the idle Socket.IO channel (#391) [72f079a]

---

### 📊 Statistics

- **Total Commits**: 18
- **Contributors**: 3


