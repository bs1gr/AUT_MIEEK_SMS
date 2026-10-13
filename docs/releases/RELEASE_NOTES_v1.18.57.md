# Release Notes - Version 1.18.57

**Release Date**: 2026-10-13
**Previous Version**: v1.18.56

## ✨ Features

- **update**: each edition updates itself in place (Lite, Docker, dev checkout, Android) [498b891]
- **db**: drop the four unused extended-absence columns; Lite's route check survives FastAPI 0.143 [9547f30]

## 🐛 Bug Fixes

- **lite**: read the heartbeat's response so pages go network-idle [066d2a1]
- **lite**: stop only after Logout or once no SMS page is open [e3f6627]

## 📝 Documentation

- **plan**: record the v1.18.56 release, its smoke test and the asset verification [370a09a]

## ✅ Tests

- **update**: run the host updater task tests on Windows only [208653a]

---

### 📊 Statistics

- **Total Commits**: 6
- **Contributors**: 1


