## What's New in v1.18.79

### 📊 What's Included in v1.18.79

- **SMS Lite can update itself from the app, after this version is installed by hand once.** Until now SMS Lite's Update saved the installer it downloads in its program folder under "Program Files", where it may not write, so every Update stopped with "Access is denied" before Windows asked for permission. It now saves the download in the user's own profile. **SMS Lite up to v1.18.78 cannot install this version by itself: download `SMS_Installer_1.18.79.exe` below and run it once.** From v1.18.79 on, Control Panel > Updates > Update SMS Lite works.
- **After its own Update, SMS Lite starts again with the user's own rights.** It used to come back running as administrator, and on a computer where someone else typed an administrator's password it would have come back as that account, with an empty database. A No at the Windows security prompt still leaves SMS Lite running.
- **Uninstalling from Settings > Apps works again.** The installer wrote the name of its uninstaller into the wrong registry entry, so Windows looked for a file that no longer existed. Answering No to "delete this installation's data folders?" now also keeps the settings (the `.env` files), as the question promises.
- **The Updates panel says what failed, in the page's language.** A failed update is no longer titled "Error checking for updates", the note that the update started goes away when it fails, and its messages are translated.
- **The Control Panel reads well in both themes.** In the dark theme it is now a white card like the rest of the System page, and the faint texts of its Updates, Diagnostics, Ports, Logs, Environment and Rate Limits tabs have enough contrast.
- **Release notes keep Greek text intact.**
- **Database:** no change of structure. Records of students, courses, grades and attendance are not touched.
- **Android app:** no change of its own; the APK is a new build with the new version number.
- **Checked before release:** the commit gate, CI and the E2E tests on every change; the full backend and frontend suites.

### 📦 Installation

**Windows:** Download `SMS_Installer_1.18.79.exe` from the assets below. The installer is signed by AUT MIEEK; Windows shows that name in the security prompt. **SMS Lite up to v1.18.78:** run this installer once by hand; the Update button cannot install it.

**Android:** Download `SMS_Android_1.18.79.apk` and open it on the phone; it updates the installed app and keeps its settings.

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
