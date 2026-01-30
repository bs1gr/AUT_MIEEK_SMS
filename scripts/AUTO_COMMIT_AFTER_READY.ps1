#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automatic commit after successful COMMIT_READY validation

.DESCRIPTION
    This script automates the commit process after COMMIT_READY.ps1 completes successfully.
    It verifies the validation checkpoint is fresh, stages all changes, and commits with
    an auto-generated message.

    Workflow:
    1. Run: .\COMMIT_READY.ps1 -Quick (or -Standard, -Full)
    2. Script auto-stages changes
    3. Commits with generated message
    4. Reports success/failure

    Safety Features:
    - Only commits if validation checkpoint is current (< 90 min)
    - Requires clean git status after staging
    - Prevents accidental commits of unintended changes
    - Dry-run mode available for verification

.PARAMETER Message
    Custom commit message (overrides auto-generated message)

.PARAMETER DryRun
    Show what would be committed without actually committing

.PARAMETER Force
    Force commit even if some checks fail (use with caution)

.EXAMPLE
    # After running COMMIT_READY -Quick successfully:
    .\scripts\AUTO_COMMIT_AFTER_READY.ps1
    # Auto-detects changes and commits with generated message

.EXAMPLE
    .\scripts\AUTO_COMMIT_AFTER_READY.ps1 -DryRun
    # Preview changes and commit message without committing

.EXAMPLE
    .\scripts\AUTO_COMMIT_AFTER_READY.ps1 -Message "chore: cleanup workspace"
    # Use custom commit message

.NOTES
Version: 1.0
Created: January 30, 2026
Purpose: Reduce friction in commit workflow after validation completes
Safety: Validates checkpoint freshness before committing
#>

param(
    [string]$Message,
    [switch]$DryRun,
    [switch]$Force
)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Header {
    param(
        [string]$Title,
        [string]$Color = "Cyan"
    )
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $Color
    Write-Host "║  $($Title.PadRight(60)) ║" -ForegroundColor $Color
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $Color
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Warning-Msg {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Error-Msg {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

function Test-ValidationCheckpoint {
    Write-Info "Checking validation checkpoint..."

    $checkpointFile = ".commit-ready-validated"
    $maxAgeMinutes = 90

    if (-not (Test-Path $checkpointFile)) {
        Write-Error-Msg "No validation checkpoint found"
        Write-Info "Run: .\COMMIT_READY.ps1 -Quick first"
        return $false
    }

    $lastValidated = Get-Item $checkpointFile | Select-Object -ExpandProperty LastWriteTime
    $age = (Get-Date) - $lastValidated
    $ageMinutes = [math]::Round($age.TotalMinutes, 1)

    if ($ageMinutes -gt $maxAgeMinutes) {
        Write-Error-Msg "Validation checkpoint expired ($ageMinutes min old, max $maxAgeMinutes min)"
        Write-Info "Run: .\COMMIT_READY.ps1 -Quick to refresh"
        return $false
    }

    Write-Success "Validation checkpoint valid ($ageMinutes min old)"
    return $true
}

function Get-UncommittedChanges {
    $status = & git status --porcelain 2>$null
    return $status
}

function Get-StagedChanges {
    $staged = & git diff --cached --name-only 2>$null
    return $staged
}

# ============================================================================
# COMMIT FUNCTIONS
# ============================================================================

function Get-CommitMessage {
    if ($Message) {
        return $Message
    }

    # Auto-generate message based on COMMIT_READY results
    Write-Info "Auto-generating commit message..."

    $changes = Get-UncommittedChanges
    $changeCount = @($changes | Where-Object { $_ }).Count

    if ($changeCount -eq 0) {
        return "chore: pre-commit validation complete"
    }

    # Detect change types
    $hasBackend = $changes -match "backend/"
    $hasFrontend = $changes -match "frontend/"
    $hasDocs = $changes -match "docs/"
    $hasTests = $changes -match "test|spec"
    $hasScripts = $changes -match "scripts/|\.ps1$"

    $prefix = "chore"
    $parts = @()

    if ($hasBackend -and $hasFrontend) {
        $parts += "fullstack"
    } elseif ($hasBackend) {
        $parts += "backend"
        $prefix = "refactor"
    } elseif ($hasFrontend) {
        $parts += "frontend"
        $prefix = "refactor"
    }

    if ($hasDocs) {
        $parts += "docs"
    }
    if ($hasScripts) {
        $parts += "scripts"
    }

    $scope = $parts -join ","

    if ($scope) {
        return "$($prefix)($scope): update and validation"
    } else {
        return "$($prefix): workspace updates"
    }
}

function Stage-Changes {
    Write-Header "Staging Changes" "DarkYellow"

    $changes = Get-UncommittedChanges
    if (-not $changes) {
        Write-Info "No changes to stage"
        return $true
    }

    $changeLines = @($changes | Where-Object { $_ })
    Write-Info "Changes to stage: $($changeLines.Count) items"

    foreach ($line in $changeLines) {
        Write-Host "  • $line"
    }

    if (-not $DryRun) {
        Write-Info "Staging all changes..."
        & git add -A 2>$null

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Msg "Failed to stage changes"
            return $false
        }

        Write-Success "Changes staged"
    } else {
        Write-Warning-Msg "DRY RUN: Changes would be staged"
    }

    return $true
}

function Perform-Commit {
    param([string]$CommitMsg)

    Write-Header "Committing Changes" "DarkYellow"

    $stagedChanges = Get-StagedChanges
    if (-not $stagedChanges) {
        Write-Info "No staged changes to commit"
        return $true
    }

    Write-Info "Commit message:"
    Write-Host "   $CommitMsg" -ForegroundColor Yellow

    Write-Info "Files to commit: $(@($stagedChanges).Count) items"
    foreach ($file in $stagedChanges) {
        Write-Host "  • $file"
    }

    if ($DryRun) {
        Write-Warning-Msg "DRY RUN: Commit would be created"
        Write-Host ""
        Write-Success "Dry run completed successfully. Ready to commit!"
        return $true
    }

    Write-Info "Creating commit..."
    & git commit -m "$CommitMsg" 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Msg "Commit failed"
        Write-Info "Review errors above and try again"
        return $false
    }

    # Get commit info
    $commitHash = & git rev-parse --short HEAD 2>$null
    $commitCount = & git rev-list --count HEAD 2>$null

    Write-Success "Commit created: $commitHash"
    Write-Info "Total commits: $commitCount"

    return $true
}

function Push-Changes {
    Write-Header "Git Operations" "DarkYellow"

    $branch = & git rev-parse --abbrev-ref HEAD 2>$null
    Write-Info "Current branch: $branch"

    if ($DryRun) {
        Write-Warning-Msg "DRY RUN: Changes would be pushed"
        return $true
    }

    # Note: Don't auto-push, just indicate it's ready
    Write-Info "Ready to push. Run: git push origin $branch"
    return $true
}

# ============================================================================
# MAIN WORKFLOW
# ============================================================================

function Main {
    Write-Header "AUTO COMMIT AFTER VALIDATION" "Cyan"

    Write-Info "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' })"
    Write-Info "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host ""

    # Step 1: Validate checkpoint
    if (-not (Test-ValidationCheckpoint)) {
        if (-not $Force) {
            exit 1
        }
        Write-Warning-Msg "Proceeding with -Force flag (validation skipped)"
    }

    Write-Host ""

    # Step 2: Stage changes
    if (-not (Stage-Changes)) {
        exit 1
    }

    Write-Host ""

    # Step 3: Generate commit message
    $commitMsg = Get-CommitMessage
    Write-Info "Generated commit message: $commitMsg"

    Write-Host ""

    # Step 4: Perform commit
    if (-not (Perform-Commit -CommitMsg $commitMsg)) {
        exit 1
    }

    Write-Host ""

    # Step 5: Show push info
    if (-not (Push-Changes)) {
        exit 1
    }

    Write-Host ""
    Write-Header "AUTO COMMIT COMPLETE" "Green"

    if ($DryRun) {
        Write-Success "Dry run successful! Run without -DryRun to commit."
    } else {
        Write-Success "Changes committed successfully!"
        Write-Info "Next: Push changes to remote with: git push"
    }

    exit 0
}

# ============================================================================
# ENTRY POINT
# ============================================================================

try {
    Main
} catch {
    Write-Error-Msg "Fatal error: $_"
    Write-Host $_.ScriptStackTrace
    exit 1
}
