# Release Notes - Version 1.18.38

**Release Date**: 2026-09-05
**Previous Version**: v1.18.37

## 🐛 Bug Fixes

- correct VERSION file lookup depth for Docker layout [54cde03]
- repair SMS_Lite.exe (PyInstaller onefile build was completely broken) [907292f]
- replace Math.random() with crypto.getRandomValues() for local queue/history IDs [efa56ed]
- pin npm 11 in Dockerfile.fullstack frontend build stage [07fea9c]
- remove duplicate @vitest/coverage-v8 entry from dependencies [12c8e58]

## ♻️ Refactoring

- dedup performSave/syncSnapshotToServer request-building logic [afc1b62]

## 📝 Documentation

- record Docker version-reporting fix and DOCKER.ps1 -Update bug [9319d68]
- record full 4-mode smoke test ahead of v1.18.38 [0aa4400]
- log SMS_Lite.exe fix in Unreleased changelog [11f8fdc]
- log insecure-randomness fix in Unreleased changelog [6078574]
- record dev-DB stray E2E test data cleanup [aaa3ab6]
- record performSave/syncSnapshotToServer dedup completion [99efa59]
- fix stale content and split historical log out of UNIFIED_WORK_PLAN.md [06aeb0f]
- close out post-v1.18.36 review todos in work plan [184bf7b]
- record v1.18.37 release and the Docker CI npm-arborist fix [85dfb80]

## 📦 Other Changes

- GitHub Copilot
- [get_ver]
- [at exac]
- [source ]
- [Dockerf]
- [(one le]
- [reporti]
- [Now che]
- [VERSION]
- [/health]
- [access ]
- [Co-Auth]
- GitHub Copilot
- [SMS_Lit]
- [availab]
- [Docker']
- [testing]
- [Co-Auth]
- GitHub Copilot
- GitHub Copilot
- [crashin]
- [1. pyda]
- [   the ]
- [   the ]
- [   exte]
- [   Fixe]
- [   hidd]
- [   pyda]
- [2. Once]
- [   Sett]
- [   the ]
- [   so S]
- [   app ]
- [   SECR]
- [   (mat]
- [   stay]
- [Also fi]
- [(was re]
- [on this]
- [from he]
- [excepti]
- [is what]
- [seeming]
- [every r]
- [Verifie]
- [login, ]
- [Co-Auth]
- GitHub Copilot
- GitHub Copilot
- [offline]
- [local d]
- [offline]
- [shared ]
- [Math.ra]
- [existin]
- [Co-Auth]
- GitHub Copilot
- [(tests/]
- [pattern]
- [cascade]
- [Co-Auth]
- GitHub Copilot
- GitHub Copilot
- [flush) ]
- [PUT-wit]
- [a DELET]
- [with a ]
- [the hoo]
- [a reloc]
- [Extract]
- [functio]
- [own id ]
- [a serve]
- [map. St]
- [functio]
- [by trac]
- [- atten]
- [  norma]
- [  alway]
- [- recor]
- [  branc]
- [- drops]
- [  depen]
- [Design ]
- [content]
- [the sha]
- [chunkin]
- [test pr]
- [request]
- [changes]
- [a real ]
- [read vi]
- [shared ]
- [writing]
- [Co-Auth]
- GitHub Copilot
- [- Stale]
- [  contr]
- [  the h]
- [- Broke]
- [  in th]
- [- 3 moj]
- [- A few]
- [- A mis]
- [  code ]
- [- 2 dea]
- [  or ch]
- [- A dan]
- [  now m]
- [Structu]
- [Phase 6]
- [prepara]
- [docs/pl]
- [own sta]
- [referen]
- [now foc]
- [Co-Auth]
- GitHub Copilot
- [Co-Auth]
- GitHub Copilot
- GitHub Copilot
- [("Canno]
- [project]
- [root-ca]
- [vitest']
- [Removin]
- [fix it ]
- [npm 11 ]
- [`docker]
- [run of ]
- [routers]
- [Co-Auth]
- GitHub Copilot
- [depende]
- [version]
- [app cod]
- [This co]
- [job on ]
- [from pa]
- [binarie]
- [hit a r]
- [(readin]
- [locally]
- [fronten]
- [Co-Auth]
- GitHub Copilot

---

### 📊 Statistics

- **Total Commits**: 161
- **Contributors**: 2


