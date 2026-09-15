## What's New in v1.18.42

A maintenance release focused on Android reliability, security fixes, and Greek-language
correctness. No database migration is required and no configuration changes are needed —
upgrading is a straight installer run.

### 🔴 Android: app no longer loses your server and sign-in

If you use the Android app, this is the important one. Saved settings were only ever kept
in the browser-style local storage, which Android is free to wipe when it needs memory.
The backing store meant to protect against exactly that was silently doing nothing, so a
memory-pressure wipe would drop your configured server address and sign-in details and
send you back to the connection-setup screen. Settings are now written to Android's own
persistent storage and survive being cleared, and app start-up is about 3 seconds faster
because a failing internal call no longer has to time out on every launch.

### 🔒 Security

- The `/api/v1/admin/health` endpoint reported student and course counts to anyone who
  asked, with no sign-in required. It now requires an administrator.
- Docker setup generated its database password and secret key with a non-cryptographic
  random generator. Both now use a secure one.
- The Windows build's code-signing password is no longer stored in the repository.
- Production Docker images no longer risk including a developer's local `.env` file.

### 🇬🇷 Greek language

- The attendance calendar showed untranslated English messages to Greek users when
  selecting a course or when saving failed.
- Fixed 128 duplicate translation keys across 9 files, where a second definition silently
  replaced the first and left some translated text unreachable.
- Added roughly 35 missing translations across the Import/Export screens.

### 🛠️ Administration

- The SMTP **Email Configuration** panel was present but unreachable — there was no way to
  set up outgoing email from the running app. It is now wired into
  System → Control Panel → Maintenance, along with a fix for an administrator permission
  check that rejected every genuine admin.
- **Import/Export** is now reachable from the interface instead of only by typing its URL.
- Added in-app help for Custom Dashboards, Semester Archive, and Roles & Permissions.

### 🧹 Internal

Repaired the Windows release pipeline's version-stamping, which had been silently doing
nothing since June. Restored the Android release build. Removed around 1,700 lines of
dead code, and reorganised four oversized interface files behind roughly 120 new
automated tests. None of this changes how the application behaves.

---

### 📦 Installation

**Windows** — download `SMS_Installer_1.18.42.exe` from the assets below and run it. The
installer is signed by AUT MIEEK; Windows will show that name in the security prompt.

**Docker**

```powershell
.\infra\scripts\dev\DOCKER.ps1 -Update
```

**Development (native)**

```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

### 📚 Documentation

- [CHANGELOG](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/CHANGELOG.md) — full list of changes in this release
- [User Guide](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/user/USER_GUIDE_COMPLETE.md)
- [Documentation Index](https://github.com/bs1gr/AUT_MIEEK_SMS/blob/main/docs/DOCUMENTATION_INDEX.md)
