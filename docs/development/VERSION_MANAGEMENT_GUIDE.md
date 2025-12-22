# Version Management Guide (Consolidated)

**Version:** 1.9.9
**Last Updated:** 2025-12-06
**Scope:** Single source for VERIFY_VERSION.ps1 usage, release workflow, CI/CD integration, and pip version note.

---

## 🚀 Quick Commands

### Check all references (no changes)

```powershell
.\scripts\VERIFY_VERSION.ps1
```

### Update everything to VERSION file value

```powershell
.\scripts\VERIFY_VERSION.ps1 -Update
```

### Check/update specific version + report

```powershell
.\scripts\VERIFY_VERSION.ps1 -Version "1.9.9" -Update -Report
```

### Generate report only

```powershell
.\scripts\VERIFY_VERSION.ps1 -Report
```

Exit codes: `0` = all consistent, `1` = critical failure, `2` = inconsistent (needs review).

---

## 📋 Files Checked

**Critical (must match VERSION):**

- `VERSION`
- `backend/main.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `README.md` (installer links)

**Documentation (warn only):**

- `docs/user/USER_GUIDE_COMPLETE.md`
- `docs/development/DEVELOPER_GUIDE_COMPLETE.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/deployment/QNAP_DEPLOYMENT_GUIDE_COMPLETE.md`

---

## 🔄 Release Workflow

1) **Set target version:**

  ```powershell
  Set-Content .\VERSION "1.9.9"
  ```

2) **Verify & update all references:**

  ```powershell
  .\scripts\VERIFY_VERSION.ps1 -Update -Report
  ```

3) **Run commit validation:**

  ```powershell
  .\COMMIT_READY.ps1 -Standard
  ```

4) **Commit & tag:**

  ```powershell
  git add -A
  git commit -m "chore: bump version to 1.9.9"
  git tag -a 1.9.9 -m "Release 1.9.9"
  git push origin main --tags
  ```

---

## 🧪 CI/CD Integration

Use in GitHub Actions (example):

```yaml
- name: Verify version consistency
  run: .\scripts\VERIFY_VERSION.ps1 -CheckOnly
  shell: pwsh
```

Handling exit codes:

- `0` → proceed
- `1`/`2` → fail the job (review inconsistencies)

---

## 🪝 Optional Git Hook

Create `.git/hooks/pre-commit`:

```powershell
#!/usr/bin/env pwsh
Write-Host "Running version verification..." -ForegroundColor Cyan
& "$PSScriptRoot\..\..\scripts\VERIFY_VERSION.ps1" -CheckOnly
if ($LASTEXITCODE -eq 1) { exit 1 }
if ($LASTEXITCODE -eq 2) { exit 1 }
Write-Host "✅ Version verification passed" -ForegroundColor Green
```

Make executable:

```powershell
git update-index --chmod=+x .git/hooks/pre-commit
```

---

## 🧰 Pip Version Note (Backend)

`NATIVE.ps1 -Setup` upgrades pip to **25.3** automatically in the venv. Manual upgrade:

```powershell
.\scripts\dev\upgrade-pip.ps1
# or
.\.venv\Scripts\python.exe -m pip install --upgrade pip==25.3
```

---

## 🗃️ Archived Docs

The following were consolidated here and moved to `archive/version-management-2025-12-06/`:

- `VERSION_AUTOMATION_GUIDE.md`
- `VERSION_MANAGEMENT_QUICK_REF.md`
- `version-automation.md`
- `PIP_VERSION.md`

Use this guide as the canonical reference going forward.
