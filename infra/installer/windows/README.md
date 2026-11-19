# SMS Installer (Inno Setup)

**Read against the scripts:** 19 November 2026, `main` after v1.18.74. No installer was built
or run for this reading; the last section says what that leaves open.

This file described the installer of v1.18.11 until November 2026: a "Fresh Install" choice
that does not exist, an upgrade that restores the `.env` files (it does not), an uninstaller
file named `Uninstall_SMS_1.18.11.exe`, a 25-30 MB installer. The earlier text is in the
repository's history.

This folder holds the only Inno Setup configuration of the repository. It is live:
`infra/scripts/release/INSTALLER_BUILDER.ps1` and the release workflow build from it, and a
change of its path has to be made in that script in the same change.

**For the person who installs SMS**, what the wizard asks and does, where the data is, how to
update and uninstall: [docs/operations/INSTALLATION_GUIDE.md](../../../docs/operations/INSTALLATION_GUIDE.md).
The rest of this file is for whoever changes or builds the installer.

## The two editions

One installer, `SMS_Installer_<version>.exe`, installs one of two editions, chosen on the
wizard's page "Installation Type":

| | Native Lite Edition | Docker Production Edition |
|---|---|---|
| What is installed | `SMS_Lite.exe` with its `_internal` folder (built with PyInstaller) | The source of the application, `DOCKER.ps1` and `SMS_Manager.exe`; the Docker image is built on the PC |
| Needs | Windows 10 or 11 | Windows 10 or 11, Docker Desktop |
| Guide | [LITE_EDITION_GUIDE.md](../../../docs/deployment/LITE_EDITION_GUIDE.md) | [DOCKER_OPERATIONS.md](../../../docs/deployment/DOCKER_OPERATIONS.md) |

An installation that is already there is updated in place and keeps its edition; there is no
"fresh install" choice. Which database each edition uses, and what the uninstaller deletes
and does not delete, are in the installation guide (sections 2, 5 and 7).

## Which installer is the real one

The installer on a release is the one the tag's workflow builds from a clean checkout, signs
and uploads (`.github/workflows/release-installer-with-sha.yml`). A build made on a
developer's PC lands in `infra\installer\dist` and is for testing only: **never upload it or
hand it out.** Until November 2026 such a build packed that PC's own settings and data.

Since then `SMS_Installer.iss` leaves out what a working copy holds besides the tracked
files, and `scripts\validate_installer_release_inputs.ps1` (the commit gate's "Installer
Input Guard", also run by the builder and by the workflow) fails when a wildcard line of
`[Files]` would take a file that git does not track.

## Files

| File | What it is |
|---|---|
| `SMS_Installer.iss` | The installer script. The version comes from the `VERSION` file. |
| `Greek.isl` | The Greek messages: Inno Setup's own, and under `[CustomMessages]` the Greek of every `english.…` message in the script. UTF-8 with a byte order mark. |
| `installer_welcome.rtf`, `installer_welcome_el.rtf` | The page shown before the files are copied. **Generated**, see below. |
| `installer_complete.rtf`, `installer_complete_el.rtf` | The page shown after the files are copied. **Generated.** |
| `installer_complete_lite.rtf`, `installer_complete_lite_el.rtf` | Named by nothing in the script; no page shows them. |
| `LICENSE_EL.txt` | The licence page of the Greek wizard. |
| `wizard_image.bmp`, `wizard_small.bmp` | The wizard's pictures, made by `create_wizard_images.ps1` at every build. |
| `run_docker_install.cmd` | What the page "Completing Installation" runs for the Docker edition: `DOCKER.ps1 -Install -Silent -NoShortcut`. |
| `SaveLiteEditionQnapCredentials.ps1` | Stores the QNAP settings typed into the wizard for SMS Lite. |
| `SMS_Manager\`, `BUILD_SMS_MANAGER.cmd` | The source of `SMS_Manager.exe`, the console menu of the Docker edition (.NET, one self-contained file). |
| `AUT_MIEEK_CodeSign.cer` | The public certificate the installer is signed with. |
| `SIGN_INSTALLER.ps1`, `INSTALL_CERTIFICATE.ps1`, `CREATE_CERTIFICATE.ps1` | Signing, trusting the certificate on a PC, making a new certificate. |
| `GREEK_ENCODING_AUDIT.ps1` | Checks the encoding of the Greek files; the builder runs it. |
| `placeholder.txt` | Keeps the `data` folder of an installation from being empty. |

The other `.md` files of this folder (`INSTALLER_CHANGELOG.md`, `INSTALLER_TESTING_GUIDE.md`
and the notes named after a version or a fix) are records of their own day. They were not
read against the script for this file.

## The wizard's texts

- **Messages** (page titles, questions, labels): English as `english.Name=…` under
  `[CustomMessages]` in `SMS_Installer.iss`, Greek as `Name=…` in `Greek.isl`. The code asks
  for them with `CustomMessage('Name')`. A name that is missing in a language is not found
  when the script is compiled, only when the wizard reaches that line; the test
  `test_every_text_the_code_asks_for_is_there_in_both_languages` finds it. The `.iss` has no
  byte order mark: keep its English texts to ASCII.
- **The two information pages** are written at every build by
  `infra\scripts\diagnostics\fix_greek_encoding_permanent.py`, in both languages, from the
  lines in that script and with the version of the `VERSION` file. Change the lines there and
  run it; a page edited by hand is overwritten by the next build, and
  `src/backend/tests/test_installer_info_pages.py` fails until the pages and the script agree.
  The wizard shows the same two pages for both editions, so each has a part for each.
- **Still English only** in a Greek wizard, because the text is in the code: the titles of
  the pages "Prerequisites Check", "QNAP Database Configuration (Optional)" and "Completing
  Installation", the labels of the two database pages, the lines of the Docker build page,
  several message boxes and the uninstaller's question about the Docker images (about forty
  texts; see the work plan).

## Building

```powershell
.\infra\scripts\release\INSTALLER_BUILDER.ps1 -Action build -Version "X.X.X"
```

In this order it: builds SMS Lite with PyInstaller (unless `-ReuseLiteBuild`), checks the
installer's inputs, writes the information pages, checks the Greek encodings, builds
`SMS_Manager.exe`, signs `SMS_Lite` and `SMS_Manager.exe`, makes the wizard's pictures, checks
the inputs again, compiles `SMS_Installer.iss` with Inno Setup 6, signs the installer and runs
its smoke test. The result is `infra\installer\dist\SMS_Installer_<version>.exe`.

`-Action validate` checks without building, `-Action test` runs the smoke test on a built
installer, `-SkipCodeSign` leaves the signing out. A release goes through
`RELEASE_READY.ps1`, which calls this script; see the release workflow in `CLAUDE.md`.

**A compile check without an installer** (after a change of the script or of a message):

```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" /O- /Q infra\installer\windows\SMS_Installer.iss
```

It needs a file `dist\SMS_Manager.exe` beside the script (any file will do for the check),
and with `/DSMS_LITE_AVAILABLE` also a folder `dist\SMS_Lite`. It finds a mistake in the
script's code; it does not find a message name that does not exist (above).

## Signing

The installer, its uninstaller, `SMS_Lite.exe` and `SMS_Manager.exe` are signed with the
project's own certificate. There is no bought certificate, by the owner's decision.

- **Subject:** CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY
- **Valid until:** 27 November 2028
- **Thumbprint:** `2693C1B15C8A8E5E45614308489DC6F4268B075D`

`AUT_MIEEK_CodeSign.cer` is the public part and is tracked. The private key
(`AUT_MIEEK_CodeSign.pfx`) and its password file (`AUT_MIEEK_CodeSign.pfx.password.txt`) are
ignored by git and must never be committed; CI has them as secrets.

Because the certificate is the project's own, Windows shows "Unknown publisher" or "Windows
protected your PC" on a PC that does not trust it, and Smart App Control may block
`SMS_Lite.exe`. `INSTALL_CERTIFICATE.ps1`, run as administrator, puts the certificate into the
PC's trusted root and trusted publisher stores. What to tell a user is in the Lite guide,
"Problem: Windows blocks the installer or SMS_Lite.exe".

## The uninstaller

Inno Setup names it `unins000.exe`; after the installation the script renames it to
`unins<version>.exe` (for example `uninsv1.18.74.exe`) and points the entry under **Settings** >
**Apps** at it. The two questions it asks, and what stays on the PC afterwards, are in the
installation guide, section 7.

## What was not tried

- No installer was built, installed or uninstalled for this reading, and no page of the wizard
  was seen. After the change of 19 November 2026 (the information pages, the last page of an
  SMS Lite installation) the script was compiled with and without SMS Lite; the pages
  themselves were checked as text against the scripts they describe.
- `INSTALL_CERTIFICATE.ps1`, `CREATE_CERTIFICATE.ps1` and the smoke test of the builder were
  not run.
- Whether a long Greek text fits its place on a wizard page cannot be seen without running the
  wizard.
