# Release Notes - Version 1.18.70

**Release Date**: 2026-11-15
**Previous Version**: v1.18.69

## ✨ Features

- **dev**: show the real backend startup stage in NATIVE.ps1; stop restarting a running stack (#383) [14c2225]

## 🐛 Bug Fixes

- refusals are not logged as errors, dead refresh tokens are removed, E2E setup failures fail (#390) [f526eba]
- **logging**: the server keeps logging after its startup migrations (#387) [992c185]
- **attendance**: one live row per attendance period and per daily rating, enforced by the database (#386) [4dedd34]
- **security**: a refresh token is not a login credential; Socket.IO connections must present an access token (#385) [f99edc1]
- **dev**: keep the dev backend's packages in step with requirements.txt; run startup tasks unless a test is running (#384) [c4fb403]

## 📝 Documentation

- **plan**: the grade pair found on 2026-11-15 is intended (owner); merge commits of #386 to #388 recorded (#389) [c22ef45]
- **plan**: v1.18.69 released - published assets verified [a4edb21]

## 🧹 Chores

- record the 2026-11-15 review in the plan; one dependency list; stale notes corrected (#388) [8809ee0]

---

### 📊 Statistics

- **Total Commits**: 9
- **Contributors**: 2


