# Release Notes - Version 1.18.62

**Release Date**: 2026-10-28
**Previous Version**: v1.18.61

## ✨ Features

- **release**: run the frozen Lite as part of the installer smoke test (#328) [c548e15]
- **android**: system-bar strips follow the app chrome; EdgeToEdge.enable in MainActivity (#326) [3af802d]
- **installer**: sign the Lite payload and the uninstaller, harden the release signature gate (#325) [7b3e32d]

## 🐛 Bug Fixes

- **release**: Lite runtime check must remove, not blank, the env vars it added (#329) [88d2458]
- **lite**: make the PyInstaller exclude list real and prune what Lite needs (#324) [6eab40e]

## 📝 Documentation

- **plan**: todo 30 - CODESIGN_CERT_THUMBPRINT secret set by the owner (#327) [6f7f067]
- **plan**: frozen-Lite smoke on the Vite 8 bundle passed 14/14 (#323) [2841462]
- **plan**: todo 34 complete - step 5b merged as #320 (#321) [72cb0e4]
- **plan**: v1.18.61 Android export fix confirmed on the owner's phone [9282d48]
- **plan**: record v1.18.61 release; make /health test host-independent [e8caee6]

## 🧹 Chores

- **frontend**: replace manualChunks with Rolldown codeSplitting (#322) [6200937]
- **frontend**: Vite 8.3.5, plugin-react 6.1.2, vite-plugin-pwa 2.0.0 (majors batch 5b) (#320) [89dbdfb]
- **frontend**: Vitest 5.0.5 and jsdom 30.1.3 (majors batch 5a) (#319) [202b9f5]
- **frontend**: lucide-react 1.62.0 and delete the module shims (#318) [1c877d6]
- **frontend**: ESLint 10 (eslint 10.13.0, @eslint/js 10.0.1) (#317) [77971e4]
- **frontend**: TypeScript 6.0.3 and unpin @vitest/eslint-plugin (#315) [4e89f18]
- **frontend**: first batch of major upgrades (i18next 26, react-i18next 17, framer-motion 14, resolvers 6) (#313) [2893e3f]

---

### 📊 Statistics

- **Total Commits**: 17
- **Contributors**: 2


