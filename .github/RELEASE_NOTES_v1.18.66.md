## What's New in v1.18.66

### 📊 What's Included in v1.18.66

A maintenance release: dependency updates only. No new features and no database changes.

- **Backend:** SQLAlchemy 2.1.8, psycopg 3.3.8, pydantic 2.14.3, python-socketio 5.18.1, pandas 3.1.1, python-multipart 0.0.33 and smaller updates.
- **Frontend:** a 92-package minor/patch update (TanStack Query 5.106, i18next 26.7, react-i18next 17.1, lucide-react 1.69, Vite 8.3.6, Playwright 1.65) and `@types/node` 25 (type definitions only).
- **CI:** the Gitleaks secret-scan download now retries transient errors.
- **Checked before release:** 1,300 backend tests (1,261 passed, 39 skipped, 0 failed), and the packaged SMS Lite build starts, signs in, serves Greek data and PDFs, and loads the app.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.66.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt.

**Docker:**
```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md)** - Full list of changes in this release
- **[User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)** - End-user documentation


