## What's New in v1.18.61

### 🌟 Highlights

- **Android exports now work.** Every export (PDF/Excel/CSV reports, student performance report, custom reports, analytics export, session JSON, calendar ICS/CSV, semester archive, backup downloads) used a blob URL and an `<a download>` click, which Android's WebView silently drops. The app now writes the file to its cache and opens the Android share sheet (open in a viewer, Print, save to Drive/Files, send). Web behaviour is unchanged. This had been broken since the Android app existed, not a v1.18.60 regression.
- New Capacitor plugins `@capacitor/filesystem` 8.1.5 and `@capacitor/share` 8.0.3.
- `RELEASE_READY.ps1` now runs the installer smoke test (signature + version resource) after the build.

### 📊 What's Included in v1.18.61

- **1 bug fix** - Android exports (12 call sites) via share sheet
- **1 release tooling fix** - Installer smoke test inside RELEASE_READY

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.61.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Android:** Download `SMS_Android_1.18.61.apk` from the assets below (sideload; enable "Install unknown apps").

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[Release Notes](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/releases/RELEASE_NOTES_v1.18.61.md)** - Full detail for this release
- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation