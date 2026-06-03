# Git LFS Migration - v1.18.24 Release

**Date:** June 3, 2026  
**Status:** ✅ COMPLETE  
**Commit:** `4166a1930`

---

## What Was Done

Migrated large executable files (>50 MB) to Git LFS (Large File Storage) for proper GitHub storage.

### Files Migrated to LFS

| File | Size | SHA256 Hash |
|------|------|-------------|
| `dist/SMS_Installer_1.18.24.exe` | 92.96 MB | `235e9804e9` (LFS pointer) |
| `dist/SMS_Lite.exe` | 68.56 MB | `a9cbdb09e6` (LFS pointer) |

### Configuration

Added to `.gitattributes`:
```
*.exe filter=lfs diff=lfs merge=lfs -text
installer/SMS_Installer_*exe filter=lfs diff=lfs merge=lfs -text
```

---

## Why This Was Needed

GitHub has a **50 MB recommended file size limit**. Files larger than this are:
- Slow to clone/download
- Waste bandwidth
- May be rejected by GitHub API

Git LFS solves this by:
1. Storing pointers in git (tiny text files)
2. Storing actual binaries in LFS storage
3. Allowing efficient downloads (parallel, resumable)

---

## Upload Results

```
Uploading LFS objects: 100% (2/2), 169 MB | 3.5 MB/s, done.
```

✅ Both files successfully uploaded to Git LFS storage  
✅ LFS pointers committed to main branch  
✅ GitHub can now serve these files efficiently

---

## How Users Download

### Option 1: Normal Git Clone (Recommended)
```bash
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
# Git automatically downloads LFS files
# Files appear as normal .exe files
```

### Option 2: GitHub Release Download
Users can download directly from GitHub Releases page without cloning.

### Option 3: Direct Access
After cloning, files are at:
- `dist/SMS_Installer_1.18.24.exe`
- `dist/SMS_Lite.exe`

---

## Verification

### Check LFS Files
```bash
git lfs ls-files
```

Output:
```
235e9804e9 * dist/SMS_Installer_1.18.24.exe
a9cbdb09e6 * dist/SMS_Lite.exe
add49fa37c * installer/SMS_Installer_1.18.9.exe
```

### Check Actual File Sizes
```bash
ls -lh dist/*.exe
```

---

## What's in the Repository Now

✅ **Code** - All source code with QNAP fix  
✅ **Documentation** - Complete guides and test results  
✅ **Executables (LFS)** - SMS_Installer_1.18.24.exe and SMS_Lite.exe  
✅ **Configuration** - Git LFS tracking enabled  

---

## Future Releases

For future releases:
1. Build new executables locally
2. Commit with `git add -f dist/SMS_*.exe`
3. Push normally - Git LFS handles large files automatically

No additional configuration needed!

---

**Repository:** https://github.com/bs1gr/AUT_MIEEK_SMS  
**Status:** ✅ Ready for distribution
