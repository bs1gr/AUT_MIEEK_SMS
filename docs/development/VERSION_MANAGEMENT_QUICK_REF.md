# Version Management Quick Reference

> **Quick access:** Use `.\scripts\VERIFY_VERSION.ps1` for all version management tasks

---

## 🚀 Common Commands

### Check All Version References (No Changes)
```powershell
.\scripts\VERIFY_VERSION.ps1
```
**Result:** Shows which files have correct/incorrect versions. Exit code 0 = all correct, 1 = issues found.

---

### Check Specific Version (Pre-Release Test)
```powershell
.\scripts\VERIFY_VERSION.ps1 -Version "1.9.0"
```
**Use case:** Before starting a release, test what would change.

---

### Update All Version References
```powershell
# Step 1: Update VERSION file
Set-Content .\VERSION "1.9.0"

# Step 2: Update all files automatically
.\scripts\VERIFY_VERSION.ps1 -Update
```
**Result:** Updates 11+ files across the codebase in <2 seconds.

---

### Generate Verification Report
```powershell
.\scripts\VERIFY_VERSION.ps1 -Report
```
**Result:** Creates `VERSION_VERIFICATION_REPORT.md` with detailed status.

---

### Update + Report (Full Workflow)
```powershell
.\scripts\VERIFY_VERSION.ps1 -Version "1.9.0" -Update -Report
```
**Use case:** Complete version bump with audit trail.

---

## 📋 Files Checked Automatically

### Critical Files (Must Match)
- `VERSION` - Single source of truth
- `backend/main.py` - API docstring version
- `frontend/package.json` - NPM package version
- `frontend/package-lock.json` - NPM lock version (auto-synced)
- `README.md` - Installer download links (2 locations)

### Documentation Files
- `docs/user/USER_GUIDE_COMPLETE.md`
- `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/qnap/QNAP_INSTALLATION_GUIDE.md`

### Installer Scripts
- `tools/installer/SMS_INSTALLER_WIZARD.ps1`
- `tools/installer/SMS_UNINSTALLER_WIZARD.ps1`

---

## 🔄 Typical Release Workflow

```powershell
# 1. Update VERSION file
Set-Content .\VERSION "1.9.0"

# 2. Verify and update all references
.\scripts\VERIFY_VERSION.ps1 -Update -Report

# 3. Review changes
git status

# 4. Commit
git add -A
git commit -m "chore: bump version to 1.9.0"

# 5. Tag release
git tag -a v1.9.0 -m "Release v1.9.0"

# 6. Push
git push origin main --tags
```

---

## 🎯 Exit Codes (CI/CD Integration)

| Code | Meaning | Action |
|------|---------|--------|
| `0` | All versions consistent | ✅ Continue |
| `1` | Critical issues found | ❌ Block release |
| `2` | Inconsistent versions | ⚠️ Review needed |

**Use in CI/CD:**
```yaml
- name: Verify Version Consistency
  run: .\scripts\VERIFY_VERSION.ps1
  shell: pwsh
```

---

## 🛠️ Pre-Commit Hook (Optional)

Automatically check versions before every commit:

```powershell
# .git/hooks/pre-commit (Windows/PowerShell)
#!/usr/bin/env pwsh
.\scripts\VERIFY_VERSION.ps1
exit $LASTEXITCODE
```

**Enable:**
```powershell
Copy-Item scripts/VERIFY_VERSION.ps1 .git/hooks/pre-commit
```

---

## ❌ Common Mistakes

### ❌ Don't: Edit version in multiple files manually
```powershell
# Manual editing - error-prone, time-consuming
notepad backend/main.py
notepad frontend/package.json
notepad README.md
# ... 10 more files
```

### ✅ Do: Use automation
```powershell
Set-Content .\VERSION "1.9.0"
.\scripts\VERIFY_VERSION.ps1 -Update
```

---

### ❌ Don't: Forget package-lock.json
Manual updates often miss `frontend/package-lock.json`, causing NPM warnings.

### ✅ Do: Script handles it automatically
The script auto-syncs `package-lock.json` when `package.json` is updated.

---

### ❌ Don't: Skip verification
```powershell
git commit -m "bump version"  # No check = possible inconsistencies
```

### ✅ Do: Always verify first
```powershell
.\scripts\VERIFY_VERSION.ps1
git commit -m "bump version"
```

---

## 🐛 Troubleshooting

### "Pattern not found in file"
**Cause:** File format changed, pattern needs update.  
**Fix:** Edit `scripts/VERIFY_VERSION.ps1` and update the `Pattern` for that file.

### "File not found"
**Cause:** File moved or renamed.  
**Fix:** Update the `File` path in `$versionChecks` array.

### "Permission denied"
**Cause:** File is read-only or locked.  
**Fix:** Close editors, check file permissions.

### Script shows old version after update
**Cause:** Caching or multiple script versions.  
**Fix:** 
```powershell
# Force re-read
Remove-Variable * -ErrorAction SilentlyContinue
.\scripts\VERIFY_VERSION.ps1
```

---

## 📚 Full Documentation

- **Complete Guide:** `docs/VERSION_AUTOMATION_GUIDE.md`
- **Script Source:** `scripts/VERIFY_VERSION.ps1`
- **Scripts Index:** `scripts/README.md`

---

**Last Updated:** 2025-11-24  
**Script Version:** 1.0.0  
**Maintained By:** SMS Development Team
