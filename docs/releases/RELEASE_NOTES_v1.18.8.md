# Release Notes - Version 1.18.8

**Release Date**: 2026-03-08
**Previous Version**: vv1.18.21

## ✨ Features

- **backup**: add SQL backup support with encrypted/unencrypted modes [98d01f4]
- **offline**: add centralized network status hook and offline banner [599ee84]
- **control-panel**: add database management panel with backup, diagnostics, and user admin [6861368]

## 🐛 Bug Fixes

- **control-panel**: add authentication to control API client [4081766]
- **control-panel**: route database panel requests via control API client [fbdfe1a]
- **control-panel**: use authenticated apiClient for database panel requests [c6f2528]
- **frontend**: resolve dashboard TS typing failures in CI lint job [a3155f1]
- **frontend**: recover error handling flow and align search analytics hooks [496c2a2]
- **analytics**: eliminate any types from hooks, components, and utilities [b3845d6]
- **i18n**: correct version display in footer (remove double-v) [4b45b57]
- **eslint**: resolve remaining i18next hardcoded strings (41έΗΤ34 warnings) [21b7436]
- **native**: use python -m uvicorn directly to fix relative import resolution [09080fb]
- **auth**: nullify audit_logs before user delete to prevent FK violation [329e42d]
- **tests**: accept 500 in backup auth test when pg_dump unavailable [28bcede]
- **tests**: extract _is_native_windows helper to avoid corrupting os.name in CI [7a13988]
- **ci**: use normalize-version action in installer workflow [687d668]

## ♻️ Refactoring

- **control-panel**: consolidate database tab into maintenance section [8f4acb8]
- **database**: fix download auth, DRY instance lookup, fix param ordering [626e8e3]

## 📝 Documentation

- update work plan, changelog, and index to reflect vv1.18.21 release status [695301b]
- **deployment**: add multi-PC deployment guide for hybrid QNAP architecture [8e0ee52]

## ✅ Tests

- **frontend**: fix dashboard vitest helper imports and report builder prop [57ed221]

## 🧹 Chores

- **gitignore**: add Visual Studio solution files to ignore list [2d2fc42]

## 📦 Other Changes

- [Synchro]
- [Fixes p]
- [- Added]
- [- Updat]
- [- Teste]
- [Related]
- GitHub Copilot
- [- CHANG]
- [- DOCUM]
- [All doc]
- GitHub Copilot
- [- add m]
- [- align]
- [- verif]
- GitHub Copilot
- [- add t]
- [- fix C]
- [- fix d]
- [- resul]
- GitHub Copilot
- [- Add p]
- [- Fix t]
- [- Impro]
- [- Maint]
- [- Front]
- GitHub Copilot
- [- Move ]
- [- Renam]
- [- Add e]
- [- Updat]
- [- Remov]
- [This co]
- GitHub Copilot
- [- Keeps]
- [- Part ]
- GitHub Copilot
- [- Add s]
- [- URL-d]
- [- Chang]
- [- Imple]
- [- Updat]
- [Fronten]
- [- Add b]
- [- Enhan]
- [- Imple]
- [- Add h]
- [- Add i]
- [Databas]
- [- Refac]
- [- Impro]
- [- Add c]
- [Tests:]
- [- Add t]
- [- Updat]
- [- Add a]
- [i18n:]
- [- Add t]
- [- Add r]
- [Impact:]
- GitHub Copilot
- [on rela]
- [module ]
- [binding]
- [Fix: Us]
- [venv's ]
- [as a mo]
- [Fixes:]
- [- Backe]
- [- Front]
- [- No mo]
- [- Hot-r]
- [Impact:]
- GitHub Copilot
- [when de]
- [audit t]
- GitHub Copilot
- [- Repla]
- [- Fix r]
- GitHub Copilot
- [- Add O]
- [- Show ]
- [- Add c]
- [- Regis]
- [- Integ]
- [- Expor]
- GitHub Copilot
- [- Cover]
- [- Add t]
- [- Updat]
- GitHub Copilot
- [- Add b]
- [- Add d]
- [- Add l]
- [- Add E]
- [- Updat]
- GitHub Copilot
- [monkeyp]
- [global ]
- [pytest']
- [still ']
- [on your]
- [entire ]
- [Fix: ex]
- [that in]
- GitHub Copilot
- [normali]
- [normali]
- GitHub Copilot

---

### 📊 Statistics

- **Total Commits**: 130
- **Contributors**: 4
