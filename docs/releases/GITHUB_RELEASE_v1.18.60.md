## What's New in v1.18.60

### 🌟 Highlights

- **Capacitor 7 → 8** with the Android SDK 36 migration (minSdk 24, compile/target 36). The Capacitor 8 CLI needs Node 22 or later.
- **Security dependency fixes**: filelock 4.2.4, OpenTelemetry 1.45.1, vitest 4.1.12, `uuid` override (GHSA-w5hq-g745-h8pq), protobuf 7.36.2.
- **Docker build fixed**: images now `npm ci` from the lockfile. The `main` Docker build had been broken since 2026-10-25.
- **Language switcher** works on regional locales such as `en-US`; switcher and navigation accessibility labels are now translated (EN/EL).
- All minor/patch dependency updates (FastAPI 0.161.1, SQLAlchemy 2.1.6, pandas 3.1, reportlab 5.1, and the full frontend set); frontend lint job cleanup in CI.

### 📊 What's Included in v1.18.60

- **5 security fixes** - Dependency advisories closed (Dependabot and code scanning)
- **4 bug fixes** - Language switcher, accessibility labels, Docker build, Android instrumented test
- **1 platform upgrade** - Capacitor 8 / Android SDK 36

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.60.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Android:** Download `SMS_Android_1.18.60.apk` from the assets below (sideload; enable "Install unknown apps").

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[Release Notes](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/releases/RELEASE_NOTES_v1.18.60.md)** - Full detail for this release
- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation
