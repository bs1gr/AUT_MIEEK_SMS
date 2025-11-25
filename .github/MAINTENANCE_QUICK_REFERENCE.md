# Workspace Maintenance Quick Reference

**Purpose:** Quick guide for maintaining workspace consistency  
**For:** Developers, maintainers, and AI assistants

---

## 🚀 Quick Start

### Running Workspace Verification

```powershell
# Check workspace consistency
.\scripts\VERIFY_WORKSPACE.ps1

# Detailed output
.\scripts\VERIFY_WORKSPACE.ps1 -Verbose

# Generate report for documentation
.\scripts\VERIFY_WORKSPACE.ps1 -Report > workspace_report.txt
```

**What it checks:**
- ✅ File locations (config/, docker/, .github/)
- ✅ Documentation references (script names, paths)
- ✅ Root directory cleanliness (file count targets)
- ✅ Version consistency (VERSION ↔ CHANGELOG)
- ✅ Reorganization suggestions

---

## 🔧 Consolidation Tools

### 1. Remove .bat Wrappers

```powershell
# Preview changes
.\scripts\CONSOLIDATE_BAT_WRAPPERS.ps1

# Execute consolidation
.\scripts\CONSOLIDATE_BAT_WRAPPERS.ps1 -Execute

# Skip backup (use with caution)
.\scripts\CONSOLIDATE_BAT_WRAPPERS.ps1 -Execute -SkipBackup
```

**What it does:**
- Archives redundant .bat wrapper files
- Adds `#!/usr/bin/env pwsh` to .ps1 files
- Updates documentation references
- Creates archive README

**Expected results:**
- 13 .bat files archived to `archive/deprecated_bat_wrappers/`
- 13 .ps1 files updated with shebang
- Documentation updated (.bat → .ps1 references)

### 2. Update Frontend References

```powershell
# Preview changes
.\scripts\UPDATE_FRONTEND_REFS.ps1

# Execute updates
.\scripts\UPDATE_FRONTEND_REFS.ps1 -Execute

# Execute and run tests
.\scripts\UPDATE_FRONTEND_REFS.ps1 -Execute -RunTests
```

**What it does:**
- Updates translation files (help.js, controlPanel.js)
- Updates React components (HelpDocumentation.tsx, ControlPanel.tsx)
- Replaces deprecated script references
- Optionally runs frontend tests

**Expected results:**
- 4+ files updated with v2.0 script references
- 20+ deprecated references replaced
- Frontend tests passing (if -RunTests used)

---

## 📋 Standard Workflow

### Before Making Changes

1. **Verify current state:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1
   ```

2. **Document planned changes:**
   - Edit `.github/WORKSPACE_STATE.md`
   - Add to "Pending Changes" section
   - List affected files and validation steps

3. **Create branch (if using Git):**
   ```powershell
   git checkout -b feature/workspace-consolidation
   ```

### Making Changes

4. **Run consolidation tool:**
   ```powershell
   .\scripts\CONSOLIDATE_BAT_WRAPPERS.ps1 -Execute
   ```

5. **Verify immediately:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1 -Verbose
   ```

6. **Run tests:**
   ```powershell
   # Backend tests
   cd backend && pytest -q
   
   # Frontend tests
   cd frontend && npm test -- --run
   ```

### After Changes

7. **Update tracking documents:**
   - Move change from "Pending" to "Recent Changes" in WORKSPACE_STATE.md
   - Update CHANGELOG.md if user-facing
   - Check off validation checklist items

8. **Final verification:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1
   ```

9. **Commit changes:**
   ```powershell
   git add -A
   git commit -m "refactor: consolidate .bat wrappers and update frontend refs"
   ```

---

## 📊 Workspace Health Metrics

### Target Values

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Root .md files | ≤5 | 5 | ✅ |
| Root .ps1 scripts | ≤8 | 8 | ✅ |
| Config files in root | 0 | 0 | ✅ |
| Docker files in root | 0 | 0 | ✅ |
| Deprecated script refs | 0 | 20+ | ⚠️ |
| .bat wrapper files | 0 | 13 | ⚠️ |

### How to Check

```powershell
# Count root markdown files
(Get-ChildItem -Path . -Filter "*.md" -File).Count

# Count root PowerShell scripts
(Get-ChildItem -Path . -Filter "*.ps1" -File).Count

# Check for config files in root
Get-ChildItem -Path . -Filter "*.ini","*.toml" -File

# Check for docker files in root
Get-ChildItem -Path . -Filter "docker-compose*.yml" -File

# Search for deprecated references
.\scripts\VERIFY_WORKSPACE.ps1 -Verbose
```

---

## 🔍 Common Issues & Solutions

### Issue: "Config file in root directory"

**Cause:** Config file not in `config/` directory  
**Solution:**
```powershell
# Move to correct location
Move-Item .\mypy.ini .\config\mypy.ini

# Update references
# (VERIFY_WORKSPACE.ps1 will identify affected files)
```

### Issue: "Docker compose file in root"

**Cause:** Compose file not in `docker/` directory  
**Solution:**
```powershell
# Move to correct location
Move-Item .\docker-compose.monitoring.yml .\docker\

# Update script references (e.g., DOCKER.ps1)
```

### Issue: "Session/temporal document in root"

**Cause:** Planning document not archived  
**Solution:**
```powershell
# Archive to appropriate directory
Move-Item .\CONSOLIDATION_PLAN.md .\archive\sessions_2025-11\

# Update archive README
notepad .\archive\sessions_2025-11\README.md
```

### Issue: "References deprecated scripts"

**Cause:** Documentation references old v1.x scripts  
**Solution:**
```powershell
# Use automated update tool
.\scripts\UPDATE_FRONTEND_REFS.ps1 -Execute

# Or manually update:
# RUN.ps1 → DOCKER.ps1 -Start
# INSTALL.ps1 → DOCKER.ps1 -Install
# run-native.ps1 → NATIVE.ps1 -Start
```

---

## 📚 Reference Documents

### Core Documentation

- **Architecture:** `.github/EXTENDED_CONSOLIDATION_ANALYSIS.md` - Full consolidation plan
- **Change Tracking:** `.github/WORKSPACE_STATE.md` - Tracks all workspace changes
- **Scripts Guide:** `SCRIPTS_CONSOLIDATION_GUIDE.md` - v2.0 migration guide
- **Git Workflow:** `docs/development/GIT_WORKFLOW.md` - Commit standards

### Tool Documentation

- **VERIFY_WORKSPACE.ps1** - Lines 1-10 for usage help
- **CONSOLIDATE_BAT_WRAPPERS.ps1** - Lines 1-15 for options
- **UPDATE_FRONTEND_REFS.ps1** - Lines 1-15 for parameters

### Quick Access Commands

```powershell
# View tool help
Get-Help .\scripts\VERIFY_WORKSPACE.ps1 -Full
Get-Help .\scripts\CONSOLIDATE_BAT_WRAPPERS.ps1 -Full
Get-Help .\scripts\UPDATE_FRONTEND_REFS.ps1 -Full

# View consolidation guide
notepad SCRIPTS_CONSOLIDATION_GUIDE.md

# View change tracker
notepad .github\WORKSPACE_STATE.md

# View extended analysis
notepad .github\EXTENDED_CONSOLIDATION_ANALYSIS.md
```

---

## 🎯 Monthly Maintenance Tasks

### First of Each Month

1. **Run full workspace verification:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1 -Report > monthly_report_$(Get-Date -Format 'yyyy-MM').txt
   ```

2. **Archive completed changes:**
   - Review `.github/WORKSPACE_STATE.md`
   - Move "Recent Changes" older than 30 days to archive
   - Create monthly summary if significant changes occurred

3. **Check for deprecated patterns:**
   ```powershell
   # Search for TODO/FIXME/DEPRECATED markers
   git grep -n "TODO\|FIXME\|DEPRECATED\|OBSOLETE"
   ```

4. **Validate test coverage:**
   ```powershell
   cd backend && pytest --cov=backend --cov-report=term
   cd frontend && npm run test -- --coverage
   ```

5. **Update metrics in documentation:**
   - Update README.md "Project Structure" section
   - Update WORKSPACE_STATE.md "Workspace Health" metrics
   - Update CHANGELOG.md if needed

---

## 💡 Best Practices

### Adding New Files

1. **Determine correct location:**
   - Config files → `config/`
   - Docker files → `docker/`
   - Scripts → `scripts/{internal|dev|deploy|ops}/`
   - Documentation → `docs/{user|development|deployment}/`
   - Session documents → `archive/sessions_YYYY-MM/`

2. **Update references:**
   - Add to `.github/WORKSPACE_STATE.md` file registry
   - Update relevant README files
   - Add to .gitignore if temporary/generated

3. **Validate:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1
   ```

### Removing Files

1. **Archive, don't delete:**
   - Move to `archive/` with explanation
   - Create README in archive directory
   - Update CHANGELOG.md with removal rationale

2. **Update all references:**
   - Search for references: `git grep "filename"`
   - Update or remove references
   - Run VERIFY_WORKSPACE.ps1 to catch missed references

3. **Test thoroughly:**
   - Run all test suites
   - Test affected features manually
   - Verify deployment still works

### Renaming Files

1. **Use Git for tracking:**
   ```powershell
   git mv old_name.ps1 new_name.ps1
   ```

2. **Update references systematically:**
   - Use search-replace in IDE
   - Run VERIFY_WORKSPACE.ps1 to identify missed updates
   - Update WORKSPACE_STATE.md file registry

3. **Document in CHANGELOG:**
   - Add note about rename
   - Mention old name for searchability
   - Link to migration guide if complex

---

## 🚨 Emergency Procedures

### Consolidation Broke Something

1. **Revert immediately:**
   ```powershell
   git revert HEAD
   # Or restore from archive
   Copy-Item archive\deprecated_bat_wrappers\*.bat scripts\internal\
   ```

2. **Identify issue:**
   ```powershell
   # Check logs
   cat logs\app.log
   
   # Run diagnostics
   .\scripts\internal\DIAGNOSE_STATE.ps1
   ```

3. **Fix and retry:**
   - Fix identified issue
   - Test in isolated environment
   - Re-run consolidation

### Workspace Verification Fails

1. **Review issues:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1 -Verbose
   ```

2. **Fix high-priority issues first:**
   - Location issues (files in wrong directories)
   - Broken references (documentation pointing to non-existent files)

3. **Re-validate:**
   ```powershell
   .\scripts\VERIFY_WORKSPACE.ps1
   ```

### Can't Find a File After Consolidation

1. **Check file registry:**
   - Open `.github/WORKSPACE_STATE.md`
   - Search for filename in "File Location Registry"

2. **Check archive:**
   ```powershell
   Get-ChildItem -Path archive -Recurse -Filter "filename.*"
   ```

3. **Check Git history:**
   ```powershell
   git log --all --full-history -- "**/filename.*"
   ```

---

**Last Updated:** 2025-11-25  
**Maintainer:** Development Team  
**Version:** 1.0
