## What's New in v1.18.27

Maintenance release — all five stale post-flatten paths in the installer CI/CD pipeline are
corrected, a fail-fast version gate is now enforced in all three installer workflows, and
a new `bump-version.ps1` script makes future version bumps atomic and safe.

### 🐛 Fixes

- **Installer verify step** looked for the built `.exe` in `dist\` (root) — it actually lands
  in `infra\installer\dist\`. Corrected. *(commit `ad4717bd`)*
- **PyInstaller spec path** was `backend\lite_entrypoint.spec` (pre-flatten) →
  `src\backend\lite_entrypoint.spec`. *(commit `89151b64`)*
- **requirements.txt path** was `backend/requirements.txt` →
  `src/backend/requirements.txt`. *(commit `b232579d`)*
- **INSTALLER_BUILDER.ps1 path** was `.\INSTALLER_BUILDER.ps1` →
  `.\infra\scripts\release\INSTALLER_BUILDER.ps1`. *(commit `89151b64`)*
- **VERIFY_VERSION.ps1** `-Update` mode was injecting `"version": "v1.18.26"` (with
  v-prefix) into package.json — npm rejects that. Fixed to bare `"1.18.26"`.

### ✨ New

- **`scripts/bump-version.ps1`** — single command to atomically update all seven
  version-bearing files and self-verify consistency.
- **Fail-fast version gate** in all three installer workflows: `VERIFY_VERSION.ps1 -CIMode`
  now runs immediately after checkout, blocking the full build if files are out of sync.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.27.exe` from the assets below.

**Docker:**
```powershell
.\DOCKER.ps1 -Update
```

**Native (Development):**
```powershell
.\NATIVE.ps1 -Start
```

### 📚 Documentation

- **[Release Notes](docs/releases/RELEASE_NOTES_v1.18.27.md)** — full change list
- **[CHANGELOG](CHANGELOG.md)** — complete commit history
