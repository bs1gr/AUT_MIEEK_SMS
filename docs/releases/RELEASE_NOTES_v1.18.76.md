# Release Notes - Version 1.18.76

**Release Date**: 2026-11-20
**Previous Version**: v1.18.75

## ✨ Features

- **android**: the app keeps its sign-in and uses the phone's saved passwords (#446) [5ae2077]

## 🐛 Bug Fixes

- **security**: 51 async write endpoints get the rate limit the guard never checked (#444) [190936b]
- **api**: a request the server could not serve is no longer answered with 200 (#443) [c44f0df]
- **db**: SQLite enforces foreign keys where its data allows it (#442) [e7e730e]

## ⚡ Performance

- **api**: 230 endpoints that never await are plain def (todo 52 stage 2) (#445) [3750dc1]

## 📝 Documentation

- **plan**: PRs 442 to 445 merged; steps 3 to 6 of the order of work done [8b103d4]
- **plan**: v1.18.75 released and verified [ec99b78]

---

### 📊 Statistics

- **Total Commits**: 7
- **Contributors**: 2


