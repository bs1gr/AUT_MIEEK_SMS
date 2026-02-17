# Greek Text Encoding in Inno Setup Installer (v1.9.9+)

## The Permanent Solution: Build-Time Conversion Pipeline

### Problem Solved

The installer was experiencing Greek text encoding issues that persisted across rebuilds:

- **Previous Issue**: Files stored with corrupted encoding in git
- **Temporary Fixes**: Manual conversions worked for one build, then vanished on rebuild
- **Display Confusion**: PowerShell shows "garbled" output (misinterprets CP1253 as UTF-8)
- **Root Cause**: No automated process to ensure consistent encoding

### Current Solution (v1.9.9+)

An **automatic encoding pipeline** that applies every build:

```text
Git Storage (UTF-8 - human-readable)
    ↓
INSTALLER_BUILDER.ps1 triggers build
    ↓
fix_greek_encoding_permanent.py converts UTF-8 → Windows-1253
    ↓
Inno Setup 6 reads CP1253 text files
    ↓
Compiles proper Greek text into installer binary
    ↓
Windows displays correct Greek characters ✓

```text
### How It Works

#### 1. Source Files in Git (UTF-8)

Files are stored as UTF-8 for readability and easy editing:

- `installer/installer_welcome_el.txt` - Welcome screen text (UTF-8)
- `installer/installer_complete_el.txt` - Completion screen text (UTF-8)
- `fix_greek_encoding_permanent.py` - Authoritative Greek text source

#### 2. Build-Time Conversion

The `fix_greek_encoding_permanent.py` script:

- Reads authoritative UTF-8 Greek text
- Converts to Windows-1253 (CP1253) on disk
- Runs automatically before Inno Setup compilation
- No manual steps needed

#### 3. Inno Setup Compilation

- Reads CP1253 files (correct format for Greek)
- Language file `Greek.isl` has `LanguageCodePage=1253`
- Embeds proper Greek text into installer
- Result: Correct Greek characters in UI

### Why This Approach Works

**✅ Permanent**: Fix embedded in build pipeline
**✅ Automatic**: No manual intervention required
**✅ Survives Rebuilds**: Applied every time installer is built
**✅ Git-Friendly**: UTF-8 source is human-readable
**✅ Self-Documenting**: Python script contains Greek text definitions
**✅ Simple**: Clear separation: storage (UTF-8) vs. compilation (CP1253)

### Understanding PowerShell Display

When you read CP1253 files in PowerShell, they appear "garbled":

```text
Disk File (hex):     CA E1 EB FE F2 20 DE F1 E8 E1 F4 E5...
PowerShell display:  ΄±»þò £ðèñôå...  (wrong interpretation)
Inno Setup reads:    "Καλώς ήρθατε..."  (correct)
Installer output:    Καλώς ήρθατε      (displayed correctly)

```text
**This is normal and expected:**

- PowerShell defaults to UTF-8 interpretation
- Windows-1253 bytes don't map to valid UTF-8 sequences
- Inno Setup knows to interpret as Windows-1253
- The final installer has correct Greek text

### How to Update Greek Text

To change Greek installer text:

1. **Edit** `fix_greek_encoding_permanent.py`:

   ```python
   content_welcome = """Καλώς ήρθατε στην Εγκατάσταση SMS
   =====================================

   [Your updated Greek text here]
   """
   ```

2. **Commit** to git:

   ```bash
   git add fix_greek_encoding_permanent.py
   git commit -m "chore: update Greek installer text"
   ```

3. **Rebuild** installer:

   ```bash
   .\INSTALLER_BUILDER.ps1 -Action build
   ```

Conversion happens automatically.

### Build Process Details

When you run `.\INSTALLER_BUILDER.ps1 -Action build`:

1. Version consistency audit
2. Greek encoding audit (verifies file status)
3. **Greek text encoding fix** ← Automatic UTF-8 → CP1253 conversion
4. Wizard image regeneration
5. Inno Setup compilation (ISCC)
6. Code signing
7. Smoke test

Step 3 ensures proper encoding **every build**.

### Technical Specifications

| Aspect | Value |
|--------|-------|
| **Inno Setup Version** | 6.0.5+ |
| **Language Code Page** | 1253 (Windows-1253) |
| **File Format** | Plain text (no RTF) |
| **Git Storage** | UTF-8 (human-readable) |
| **Disk Storage (build)** | Windows-1253 (CP1253) |
| **Conversion Tool** | Python 3 (`cp1253` codec) |
| **Build Integration** | `INSTALLER_BUILDER.ps1` |

### Verifying the Fix

To confirm Greek text displays correctly:

1. Download `SMS_Installer_1.9.8.exe`
2. Run installer, select **Ελληνικά** (Greek)
3. Verify text appears correctly:
   - Welcome: "Καλώς ήρθατε στην Εγκατάσταση SMS"
   - Requirements: All in Greek ✓
   - Completion: "Συγχαρητήρια! Η Εγκατάσταση ολοκληρώθηκε!"

### Key Files

- **Encoding Script**: `fix_greek_encoding_permanent.py` - UTF-8 → CP1253 conversion
- **Build Script**: `INSTALLER_BUILDER.ps1` - Calls encoding fix automatically
- **Installer Config**: `installer/SMS_Installer.iss` - Inno Setup script
- **Language File**: `installer/Greek.isl` - Official Inno Setup Greek translation
- **Text Files**: `installer/installer_*_el.txt` - Greek UI text

### References

- [Windows-1253 Encoding](https://en.wikipedia.org/wiki/Windows-1253)
- [Inno Setup Language Files](https://jrsoftware.org/files/istrans/)
- [Inno Setup Documentation](https://jrsoftware.org/ishelp/)

---

## Why This Solution is Better Than Previous Approaches

### Problem with Manual Fixes

- Temporary: worked for one build, then vanished
- Required manual intervention
- Didn't survive git pulls

### Problem with Previous UTF-8 Approach

- Complex: switching between code pages
- Fragile: required manual validation
- Didn't prevent encoding corruption

### Current Approach

- **Automatic**: Applied every build by design
- **Simple**: Clear UTF-8 (git) → CP1253 (compile) pipeline
- **Reliable**: No ambiguity or manual steps
- **Permanent**: Embedded in build process
