<#
.SYNOPSIS
    Bump the project version across ALL files atomically.

.DESCRIPTION
    Single entry-point for version bumps. Updates:
      • VERSION
      • src/frontend/package.json
      • src/frontend/package-lock.json (root fields only)
      • src/backend/main.py
      • docs/user/USER_GUIDE_COMPLETE.md
      • docs/development/DEVELOPER_GUIDE_COMPLETE.md
      • docs/DOCUMENTATION_INDEX.md

    Run this instead of editing VERSION manually. CI (ci-cd-pipeline.yml) will
    then see consistent versions and pass the "Verify version consistency" gate.

.PARAMETER Version
    Target version, with or without leading v (e.g. "1.18.27" or "v1.18.27").

.EXAMPLE
    .\scripts\bump-version.ps1 -Version 1.18.27
#>

param(
    [Parameter(Mandatory)][string]$Version
)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSScriptRoot

function Strip-V { param([string]$v) return $v -replace '^v', '' }

$core = Strip-V $Version
$tag  = "v$core"

if ($core -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Invalid version '$Version'. Expected format: X.Y.Z or vX.Y.Z"
    exit 1
}

Write-Host "Bumping project to $tag ..." -ForegroundColor Cyan

# ── 1. VERSION file ───────────────────────────────────────────────────────────
$versionFile = Join-Path $ROOT 'VERSION'
Set-Content -Path $versionFile -Value $tag -NoNewline -Encoding UTF8
Write-Host "  ✓ VERSION → $tag"

# ── 2. src/frontend/package.json ─────────────────────────────────────────────
$pkgPath = Join-Path $ROOT 'src\frontend\package.json'
$pkgRaw  = Get-Content $pkgPath -Raw
$pkgNew  = $pkgRaw -replace '"version":\s*"v?\d+\.\d+\.\d+"', "`"version`": `"$core`""
Set-Content -Path $pkgPath -Value $pkgNew -NoNewline -Encoding UTF8
Write-Host "  ✓ src/frontend/package.json → $core"

# ── 3. src/frontend/package-lock.json (root-level fields only) ───────────────
$lockPath = Join-Path $ROOT 'src\frontend\package-lock.json'
if (Test-Path $lockPath) {
    $lockRaw = Get-Content $lockPath -Raw
    # Replace only the first 2 occurrences of "version": "X.Y.Z"
    # (root object + packages."" entry). Dependency versions are different semver values.
    $count = 0
    $lockNew = [regex]::Replace($lockRaw, '"version":\s*"v?\d+\.\d+\.\d+"', {
        param($m)
        $script:count++
        if ($script:count -le 2) { return "`"version`": `"$core`"" }
        return $m.Value
    })
    Set-Content -Path $lockPath -Value $lockNew -NoNewline -Encoding UTF8
    Write-Host "  ✓ src/frontend/package-lock.json → $core ($count root field(s) updated)"
}

# ── 4. src/backend/main.py ───────────────────────────────────────────────────
$mainPy = Join-Path $ROOT 'src\backend\main.py'
if (Test-Path $mainPy) {
    $py    = Get-Content $mainPy -Raw
    $pyNew = $py -replace '(?m)^Version:\s*\d+\.\d+\.\d+', "Version: $core"
    Set-Content -Path $mainPy -Value $pyNew -NoNewline -Encoding UTF8
    Write-Host "  ✓ src/backend/main.py → $core"
}

# ── 5. Docs files ─────────────────────────────────────────────────────────────
$docFiles = @(
    'docs\user\USER_GUIDE_COMPLETE.md',
    'docs\development\DEVELOPER_GUIDE_COMPLETE.md'
)
foreach ($rel in $docFiles) {
    $p = Join-Path $ROOT $rel
    if (-not (Test-Path $p)) { continue }
    $c    = Get-Content $p -Raw
    $cNew = $c -replace '(?m)^\*\*Version:\*\*\s*\d+\.\d+\.\d+', "**Version:** $core"
    Set-Content -Path $p -Value $cNew -NoNewline -Encoding UTF8
    Write-Host "  ✓ $rel → $core"
}

$indexPath = Join-Path $ROOT 'docs\DOCUMENTATION_INDEX.md'
if (Test-Path $indexPath) {
    $c    = Get-Content $indexPath -Raw
    $cNew = $c -replace '(?m)^\*\*Version\*\*:\s*\d+\.\d+\.\d+', "**Version**: $core"
    $cNew = $cNew -replace '(?m)^\*\*Project Version \(documented\)\*\*:\s*\d+\.\d+\.\d+', "**Project Version (documented)**: $core"
    Set-Content -Path $indexPath -Value $cNew -NoNewline -Encoding UTF8
    Write-Host "  ✓ docs/DOCUMENTATION_INDEX.md → $core"
}

# ── 6. Verify with VERIFY_VERSION.ps1 -CIMode ────────────────────────────────
$verifyScript = Join-Path $ROOT 'scripts\VERIFY_VERSION.ps1'
if (Test-Path $verifyScript) {
    Write-Host "`nRunning VERIFY_VERSION.ps1 -CIMode to confirm consistency..." -ForegroundColor Cyan
    & $verifyScript -CIMode
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Version consistency check failed after bump. Review the output above."
        exit 1
    }
}

Write-Host "`n✅ All version files updated to $tag" -ForegroundColor Green
Write-Host "   Next: git add -A && git commit -m `"chore: bump version to $tag`"" -ForegroundColor DarkCyan
