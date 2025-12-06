# Version Management Automation Guide

This guide explains how to use the automated version verification tools to streamline release processes.

---

## Quick Start

### Check Current Version Consistency

```powershell
.\scripts\VERIFY_VERSION.ps1
```

**Output:** Shows which files have consistent version references and which need updating.

### Update All Versions Automatically

```powershell
.\scripts\VERIFY_VERSION.ps1 -Version "1.9.0" -Update
```

**Output:** Updates all version references across the codebase to 1.9.0.

### Generate Detailed Report

```powershell
.\scripts\VERIFY_VERSION.ps1 -Report
```

**Output:** Creates `VERSION_VERIFICATION_REPORT.md` with detailed analysis.

---

## Automated Workflow

### For New Releases

1. **Update VERSION file:**
   ```powershell
   Set-Content .\VERSION "1.9.0"
   ```

2. **Run automated version update:**
   ```powershell
   .\scripts\VERIFY_VERSION.ps1 -Update -Report
   ```

3. **Verify changes:**
   ```powershell
   git diff --stat
   ```

4. **Commit and tag:**
   ```powershell
   git add -A
   git commit -m "chore: bump version to 1.9.0"
   git tag -a $11.9.7 -m "Release $11.9.7"
   git push origin main --tags
   ```

---

## Pre-Commit Hook (Optional)

To automatically verify version consistency before commits, create `.git/hooks/pre-commit`:

```powershell
#!/usr/bin/env pwsh
# Pre-commit hook to verify version consistency

Write-Host "Running version verification..." -ForegroundColor Cyan

$result = & "$PSScriptRoot\..\..\scripts\VERIFY_VERSION.ps1" -CheckOnly

if ($LASTEXITCODE -eq 1) {
    Write-Host "❌ Version verification failed!" -ForegroundColor Red
    Write-Host "Run: .\scripts\VERIFY_VERSION.ps1 -Update" -ForegroundColor Yellow
    exit 1
} elseif ($LASTEXITCODE -eq 2) {
    Write-Host "⚠️  Version inconsistencies detected" -ForegroundColor Yellow
    Write-Host "Run: .\scripts\VERIFY_VERSION.ps1 -Update" -ForegroundColor Yellow
    # Allow commit but warn
    exit 0
}

Write-Host "✅ Version verification passed" -ForegroundColor Green
exit 0
```

**Enable the hook:**
```powershell
# Create the hook file
$hookContent | Set-Content .git/hooks/pre-commit
# Make it executable (Windows)
git update-index --chmod=+x .git/hooks/pre-commit
```

---

## Integration with Release Process

### Automated Release Checklist

```powershell
# 1. Update version
Set-Content .\VERSION "1.9.0"

# 2. Run comprehensive pre-commit workflow
.\scripts\PRE_COMMIT_WORKFLOW.ps1  # (if created)

# 3. Verify versions automatically
.\scripts\VERIFY_VERSION.ps1 -Update -Report

# 4. Run tests
cd backend
pytest -q
cd ..

# 5. Review changes
git status
git diff

# 6. Commit
git add -A
git commit -F COMMIT_MESSAGE_$11.9.7.md

# 7. Tag and push
git tag -a $11.9.7 -m "Release $11.9.7"
git push origin main --tags
```

---

## Files Automatically Updated

The verification script checks and updates:

### Critical Files (Exit code 1 if missing)
- `VERSION` - Master version file
- `backend/main.py` - Backend version docstring
- `frontend/package.json` - Frontend package version
- `frontend/package-lock.json` - Frontend lock file
- `README.md` - Installer download links

### Documentation Files (Warnings only)
- `docs/user/USER_GUIDE_COMPLETE.md`
- `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/qnap/QNAP_INSTALLATION_GUIDE.md`
- `tools/installer/SMS_INSTALLER_WIZARD.ps1`
- `tools/installer/SMS_UNINSTALLER_WIZARD.ps1`

---

## Exit Codes

- **0** - Success, all versions consistent
- **1** - Critical failure (missing files, errors)
- **2** - Inconsistent versions found (use `-Update` to fix)

---

## Advanced Usage

### Check Specific Version

```powershell
# Check if all files reference $11.9.7
.\scripts\VERIFY_VERSION.ps1 -Version "1.8.8" -CheckOnly
```

### Update and Generate Report

```powershell
# Update to $11.9.7 and generate detailed report
.\scripts\VERIFY_VERSION.ps1 -Version "1.9.0" -Update -Report
```

### Verify Before Push (CI/CD)

```powershell
# In GitHub Actions or CI pipeline
.\scripts\VERIFY_VERSION.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Version verification failed"
    exit 1
}
```

---

## GitHub Actions Integration

Create `.github/workflows/version-check.yml`:

```yaml
name: Version Consistency Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  verify-version:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Verify Version Consistency
        shell: pwsh
        run: |
          .\scripts\VERIFY_VERSION.ps1 -CheckOnly
          
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: version-report
          path: VERSION_VERIFICATION_REPORT.md
```

---

## Troubleshooting

### "Pattern not found in file"

**Cause:** File format changed or pattern doesn't match.

**Fix:** Update the pattern in `VERIFY_VERSION.ps1` for that specific file.

### "File not found"

**Cause:** File was moved or renamed.

**Fix:** Update the file path in `VERIFY_VERSION.ps1` or mark as non-critical.

### Permission Denied

**Cause:** File is locked or read-only.

**Fix:** 
```powershell
# Remove read-only attribute
Set-ItemProperty -Path <file> -Name IsReadOnly -Value $false
```

---

## Customization

To add new files to version verification, edit `scripts\VERIFY_VERSION.ps1`:

```powershell
$versionChecks += @{
    File = "path/to/file.ext"
    Pattern = 'regex-pattern-to-match'
    Replace = "replacement-string-with-$Version"
    Description = "Human readable description"
    Critical = $true  # or $false
}
```

**Example:** Add version check for CHANGELOG.md:

```powershell
@{
    File = "CHANGELOG.md"
    Pattern = '## \[\d+\.\d+\.\d+\]'
    Replace = "## [$Version]"
    Description = "CHANGELOG latest version"
    Critical = $false
}
```

---

## Best Practices

1. **Always run verification before committing:**
   ```powershell
   .\scripts\VERIFY_VERSION.ps1
   ```

2. **Update VERSION file first:**
   ```powershell
   Set-Content .\VERSION "1.9.0"
   .\scripts\VERIFY_VERSION.ps1 -Update
   ```

3. **Generate report for release notes:**
   ```powershell
   .\scripts\VERIFY_VERSION.ps1 -Report
   # Include VERSION_VERIFICATION_REPORT.md in release documentation
   ```

4. **Verify after manual edits:**
   ```powershell
   # After editing any version references manually
   .\scripts\VERIFY_VERSION.ps1 -CheckOnly
   ```

5. **Use in CI/CD pipelines:**
   - Enforce version consistency in automated builds
   - Fail builds if versions are inconsistent
   - Generate reports for release documentation

---

## Related Scripts

- `VERIFY_VERSION.ps1` - This automation script
- `DOCKER.ps1` - Docker deployment (reads VERSION file)
- `NATIVE.ps1` - Native development mode
- `PRE_COMMIT_WORKFLOW.ps1` - Comprehensive pre-commit checks

---

## Version Management Checklist

Before each release:

- [ ] Update `VERSION` file with new version number
- [ ] Run `.\scripts\VERIFY_VERSION.ps1 -Update -Report`
- [ ] Review generated report
- [ ] Run full test suite (backend + frontend)
- [ ] Update CHANGELOG.md with release notes
- [ ] Commit all changes
- [ ] Tag release: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push with tags: `git push origin main --tags`

---

**Last Updated:** 2025-11-24  
**Script Version:** 1.0.0  
**Maintainer:** GitHub Copilot

