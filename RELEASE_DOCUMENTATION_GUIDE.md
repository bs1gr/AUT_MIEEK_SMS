# Release Documentation Automation Guide

## Overview

The `GENERATE_RELEASE_DOCS.ps1` script automatically generates release documentation by analyzing git commits since the last release. It creates:

1. **Release Notes** - Detailed version-specific notes
2. **CHANGELOG.md** - Updated with new version entry
3. **GitHub Release Description** - Ready-to-use release text

## Quick Start

```powershell
# Auto-detect version from VERSION file
.\GENERATE_RELEASE_DOCS.ps1

# Specify version explicitly
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"

# Preview without writing files
.\GENERATE_RELEASE_DOCS.ps1 -Preview
```

## How It Works

### 1. Commit Analysis

The script analyzes commits between the last tag and HEAD, looking for:

**Conventional Commit Format**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Supported Types**:
- `feat`: New features ✨
- `fix`: Bug fixes 🐛
- `perf`: Performance improvements ⚡
- `security`: Security fixes 🔒
- `refactor`: Code refactoring ♻️
- `docs`: Documentation 📝
- `style`: Code styling 💎
- `test`: Tests ✅
- `build`: Build system 🔨
- `ci`: CI/CD 🤖
- `chore`: Maintenance 🧹
- `revert`: Reverts ⏪

**Breaking Changes**:
Detected by:
- `BREAKING CHANGE:` in commit body
- `!` after type (e.g., `feat!: remove legacy API`)

### 2. Documentation Generation

**Release Notes** (`docs/releases/RELEASE_NOTES_v1.13.0.md`):
```markdown
# Release Notes - Version 1.13.0

**Release Date**: 2025-12-27
**Previous Version**: v1.12.8

## ⚠️ BREAKING CHANGES
- **auth**: Remove legacy session support [abc1234]

## ✨ Features
- **api**: Add new analytics endpoint [def5678]
- **ui**: Implement dark mode [ghi9012]

## 🐛 Bug Fixes
- **database**: Fix connection pool leak [jkl3456]

## 📊 Statistics
- **Total Commits**: 47
- **Contributors**: 3
- **Breaking Changes**: 1
```

**CHANGELOG.md Update**:
```markdown
## [1.13.0] - 2025-12-27

### ⚠️ BREAKING CHANGES
- Remove legacy session support

### Features
- **api**: Add new analytics endpoint
- **ui**: Implement dark mode

### Bug Fixes
- **database**: Fix connection pool leak
```

**GitHub Release Description** (`docs/releases/GITHUB_RELEASE_v1.13.0.md`):
```markdown
## What's New in v1.13.0

> **⚠️ WARNING**: This release contains breaking changes.

### 🌟 Highlights
- **api**: Add new analytics endpoint
- **ui**: Implement dark mode
- **database**: Fix connection pool leak

### 📦 Installation
Download `StudentManagementSystem_1.13.0_Setup.exe` from assets.
```

## Parameters

### -Version
Target release version. Auto-detects from VERSION file if not provided.

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"
```

### -OutputDir
Directory for generated files (default: `docs/releases`)

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -OutputDir "release-docs"
```

### -Since
Start point for commit analysis (default: auto-detect last tag)

```powershell
# From specific tag
.\GENERATE_RELEASE_DOCS.ps1 -Since "v1.12.0"

# From commit hash
.\GENERATE_RELEASE_DOCS.ps1 -Since "abc123def"
```

### -Preview
Show what would be generated without writing files

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -Preview
# Displays all documentation to terminal
```

### -SkipChangelog
Don't update CHANGELOG.md

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -SkipChangelog
```

### -SkipReleaseNotes
Don't create version-specific release notes file

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -SkipReleaseNotes
```

### -SkipGitHubRelease
Don't create GitHub release description

```powershell
.\GENERATE_RELEASE_DOCS.ps1 -SkipGitHubRelease
```

## Common Workflows

### Workflow 1: Standard Release Documentation
```powershell
# 1. Generate documentation
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"

# 2. Review generated files
code docs/releases/RELEASE_NOTES_v1.13.0.md
code CHANGELOG.md

# 3. Commit changes
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v1.13.0"
git push origin main

# 4. Proceed with release
.\RELEASE_READY.ps1 -ReleaseVersion "1.13.0" -TagRelease
```

### Workflow 2: Preview Before Generating
```powershell
# 1. Preview what will be generated
.\GENERATE_RELEASE_DOCS.ps1 -Preview

# 2. If satisfied, generate for real
.\GENERATE_RELEASE_DOCS.ps1

# 3. Commit and release
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v$(cat VERSION)"
.\RELEASE_READY.ps1 -ReleaseVersion "$(cat VERSION)" -TagRelease
```

### Workflow 3: Custom Commit Range
```powershell
# Generate docs from specific starting point
.\GENERATE_RELEASE_DOCS.ps1 -Since "v1.10.0"

# Useful for:
# - Consolidating multiple releases
# - Generating docs after manual tagging
# - Creating retrospective release notes
```

### Workflow 4: Only Update CHANGELOG
```powershell
# Skip creating individual files, just update CHANGELOG
.\GENERATE_RELEASE_DOCS.ps1 -SkipReleaseNotes -SkipGitHubRelease
```

## Integration with Release Process

### Complete Release Flow (Updated)

```powershell
# PHASE 1: PREPARE
.\RELEASE_PREPARATION.ps1 -Mode Quick

# PHASE 1.5: GENERATE DOCUMENTATION (NEW)
.\GENERATE_RELEASE_DOCS.ps1 -Version "1.13.0"
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v1.13.0"
git push origin main

# PHASE 2: RELEASE
.\RELEASE_READY.ps1 -ReleaseVersion "1.13.0" -TagRelease

# PHASE 3: MONITOR
# Copy docs/releases/GITHUB_RELEASE_v1.13.0.md content
# Paste into GitHub release description when prompted
```

### Automated All-in-One Script

You can create a wrapper script:

```powershell
# RELEASE_WITH_DOCS.ps1
param([string]$Version)

Write-Host "Step 1: Preparation" -ForegroundColor Cyan
.\RELEASE_PREPARATION.ps1 -Mode Quick
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Step 2: Generate Documentation" -ForegroundColor Cyan
.\GENERATE_RELEASE_DOCS.ps1 -Version $Version
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Step 3: Commit Documentation" -ForegroundColor Cyan
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes for v$Version"
git push origin main

Write-Host "Step 4: Create Release" -ForegroundColor Cyan
.\RELEASE_READY.ps1 -ReleaseVersion $Version -TagRelease

Write-Host "`nRelease complete! Don't forget to add GitHub release description from:"
Write-Host "  docs/releases/GITHUB_RELEASE_v${Version}.md"
```

Usage:
```powershell
.\RELEASE_WITH_DOCS.ps1 -Version "1.13.0"
```

## Commit Message Guidelines

To get the best documentation, follow these commit message conventions:

### ✅ Good Commits

```
feat(api): add user search endpoint

Implements fuzzy search with pagination support.
Closes #123

BREAKING CHANGE: Search API now requires authentication
```

```
fix(auth): prevent session token leak

- Sanitize error messages
- Add security headers
- Update session cleanup logic

Fixes #456
```

```
docs: update installation guide

Add Docker deployment instructions.
```

### ❌ Bad Commits

```
fixed stuff
```

```
WIP
```

```
Update file.py
```

### Conventional Commit Template

```
<type>(<scope>): <short summary>
  │       │             │
  │       │             └─> Present tense. Not capitalized. No period.
  │       │
  │       └─> Commit Scope: api|ui|db|auth|ci|docs|etc.
  │
  └─> Commit Type: feat|fix|perf|docs|style|refactor|test|build|ci|chore

<BLANK LINE>

<body>
  - Detailed explanation
  - Can have multiple lines
  - Use bullet points

<BLANK LINE>

<footer>
  Fixes #123
  Closes #456
  BREAKING CHANGE: description
```

## Output Examples

### Example 1: Feature Release

**Commits**:
```
feat(ui): implement student dashboard
feat(api): add grade calculation endpoint
fix(db): optimize query performance
docs: update API documentation
```

**Generated Release Notes**:
```markdown
# Release Notes - Version 1.13.0

## ✨ Features
- **ui**: Implement student dashboard [abc1234]
- **api**: Add grade calculation endpoint [def5678]

## 🐛 Bug Fixes
- **db**: Optimize query performance [ghi9012]

## 📝 Documentation
- Update API documentation [jkl3456]

## 📊 Statistics
- **Total Commits**: 4
- **Contributors**: 2
```

### Example 2: Breaking Change Release

**Commits**:
```
feat(api)!: migrate to v2 authentication

BREAKING CHANGE: Legacy token format no longer supported.
All clients must upgrade to new auth flow.
```

**Generated Release Notes**:
```markdown
# Release Notes - Version 2.0.0

## ⚠️ BREAKING CHANGES
- **feat(api)!: migrate to v2 authentication** [abc1234]
  Legacy token format no longer supported.
  All clients must upgrade to new auth flow.

## ✨ Features
- **api**: Migrate to v2 authentication [abc1234]
```

**GitHub Release Description**:
```markdown
## What's New in v2.0.0

> **⚠️ WARNING**: This release contains breaking changes. Please review carefully before upgrading.

### 🌟 Highlights
- **api**: Migrate to v2 authentication

⚠️ **Migration Required**: Legacy token format no longer supported.
```

## Troubleshooting

### Issue: No commits found

```
⚠️  No commits found since v1.12.8
```

**Solution**:
- You're already at the latest tag
- Check: `git log v1.12.8..HEAD --oneline`
- If empty, create commits before generating docs

### Issue: All commits unrecognized

```
⚠️  Found 15 unrecognized commits
```

**Solution**:
- Commits don't follow conventional format
- They'll appear under "📦 Other Changes" section
- Consider using conventional commits going forward

### Issue: CHANGELOG.md not updated

```
⚠️  Could not parse CHANGELOG.md format, skipping update
```

**Solution**:
- CHANGELOG.md doesn't have expected structure
- Ensure it starts with `# Changelog`
- Manually add entry from generated release notes

### Issue: Version mismatch

```
❌ Invalid version format: v1.13.0 (expected: X.Y.Z)
```

**Solution**:
- Don't include "v" prefix in -Version parameter
- Use: `-Version "1.13.0"` not `-Version "v1.13.0"`

## Advanced Usage

### Custom Commit Range

```powershell
# Last 3 months
$since = git log --since="3 months ago" --format=%H | Select-Object -Last 1
.\GENERATE_RELEASE_DOCS.ps1 -Since $since

# Between two tags
.\GENERATE_RELEASE_DOCS.ps1 -Since "v1.10.0"
# Assumes HEAD is at v1.13.0
```

### Multiple Formats

```powershell
# Generate all formats
.\GENERATE_RELEASE_DOCS.ps1

# Then extract specific sections
$releaseNotes = Get-Content "docs/releases/RELEASE_NOTES_v1.13.0.md" -Raw
$features = $releaseNotes -split "`n" | Select-String "^- \*\*.+\*\*:"
```

### Filtering Contributors

```powershell
# Exclude bot commits
git log v1.12.8..HEAD --pretty=format:'%an' | Where-Object { $_ -notmatch 'bot' } | Sort-Object -Unique
```

## Files Created

After running the script:

```
docs/releases/
├── RELEASE_NOTES_v1.13.0.md       # Detailed release notes
└── GITHUB_RELEASE_v1.13.0.md      # GitHub release description

CHANGELOG.md                        # Updated with new entry (existing file)
```

## Best Practices

### 1. Run Before Tagging
Always generate docs BEFORE creating the release tag:
```powershell
.\GENERATE_RELEASE_DOCS.ps1  # Analyzes commits
git add CHANGELOG.md docs/releases/
git commit -m "docs: release notes"
git push
.\RELEASE_READY.ps1 -ReleaseVersion "1.13.0" -TagRelease  # Now tag
```

### 2. Review Generated Content
Don't blindly commit - review first:
```powershell
.\GENERATE_RELEASE_DOCS.ps1 -Preview  # Review in terminal
.\GENERATE_RELEASE_DOCS.ps1           # Generate if OK
code docs/releases/RELEASE_NOTES_v*.md
```

### 3. Use Conventional Commits
Train your team on conventional commits:
- Provide commit message template
- Add pre-commit hook to validate format
- Use commitizen or similar tools

### 4. Handle Breaking Changes Carefully
For breaking changes:
- Always include `BREAKING CHANGE:` in commit body
- Explain migration path
- Update documentation
- Consider major version bump

### 5. Automate Further
Add to your CI/CD:
```yaml
# .github/workflows/release-docs.yml
name: Generate Release Docs
on:
  push:
    tags:
      - 'v*'
jobs:
  docs:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate docs
        run: .\GENERATE_RELEASE_DOCS.ps1
      - name: Commit
        run: |
          git add CHANGELOG.md docs/releases/
          git commit -m "docs: auto-generated release notes"
          git push
```

## See Also

- [RELEASE_PREPARATION.ps1](RELEASE_PREPARATION.md) - Pre-release validation
- [RELEASE_READY.ps1](QUICK_RELEASE_GUIDE.md) - Release execution
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit format specification
- [Keep a Changelog](https://keepachangelog.com/) - CHANGELOG.md format

---

**Status**: ✅ Complete and documented
**Version**: 1.0
**Last Updated**: 2025-12-27
