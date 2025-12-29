#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generates comprehensive GitHub release documentation with breaking changes, migration guides, and proper formatting.

.DESCRIPTION
    This script generates professional release documentation that includes:
    - Prominent breaking changes warnings
    - Impact assessment (who needs to act)
    - Links to migration guides and detailed reports
    - Installation instructions for all deployment modes
    - Proper formatting and structure

.PARAMETER Version
    Release version (e.g., "1.13.0")

.PARAMETER BreakingChanges
    Array of breaking change commit objects

.PARAMETER Categorized
    Hashtable of categorized commits by type

.PARAMETER OutputPath
    Path to save the generated documentation

.EXAMPLE
    .\scripts/generate-release-github-description.ps1 -Version "1.13.0" -BreakingChanges @() -Categorized @{} -OutputPath ".github/RELEASE_NOTES_v1.13.0.md"

.NOTES
    Version: 1.0
    Used by GENERATE_RELEASE_DOCS.ps1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [Parameter()]
    [object[]]$BreakingChanges = @(),

    [Parameter()]
    [hashtable]$Categorized = @{},

    [Parameter()]
    [string]$OutputPath
)

function Get-ComprehensiveGitHubReleaseDescription {
    param(
        [string]$Version,
        [object[]]$BreakingChanges,
        [hashtable]$Categorized
    )

    $sb = [System.Text.StringBuilder]::new()

    # Breaking changes alert (prominent)
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("## ⚠️ BREAKING CHANGES - MAJOR Release")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("This is a **MAJOR** release with breaking changes. **Read the migration guide before upgrading if you use custom scripts.**")
        [void]$sb.AppendLine()

        # What changed section
        [void]$sb.AppendLine("### 🔴 What Changed")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("**Removed Modules (after 6+ month deprecation):**")
        [void]$sb.AppendLine()
        foreach ($commit in $BreakingChanges) {
            $subject = if ($commit.Subject) { $commit.Subject } else { $commit }
            [void]$sb.AppendLine("- $subject")
        }
        [void]$sb.AppendLine()

        # Impact assessment
        [void]$sb.AppendLine("**Affected Users:**")
        [void]$sb.AppendLine("- ❌ Custom Python scripts importing old modules → **Migration Required**")
        [void]$sb.AppendLine("- ✅ Web UI users → **No action needed**")
        [void]$sb.AppendLine("- ✅ Docker/standard deployment → **No action needed**")
        [void]$sb.AppendLine()

        [void]$sb.AppendLine("**Not Affected:**")
        [void]$sb.AppendLine("- Database schema (no migrations needed)")
        [void]$sb.AppendLine("- API endpoints (all unchanged)")
        [void]$sb.AppendLine("- Configuration files")
        [void]$sb.AppendLine()

        # Migration guide link
        [void]$sb.AppendLine("### 📖 Migration Guide")
        [void]$sb.AppendLine()
        [void]$sb.AppendLine("**[⬆️ FULL MIGRATION GUIDE](docs/guides/MIGRATION_v${Version}.md)** - Complete instructions with code examples for updating imports.")
        [void]$sb.AppendLine()
    } else {
        [void]$sb.AppendLine("## What's New in v$Version")
        [void]$sb.AppendLine()
    }

    # What's included section
    [void]$sb.AppendLine("### 📊 What's Included in v$Version")
    [void]$sb.AppendLine()

    # Feature/fix summary
    $featureCount = if ($Categorized.ContainsKey('feat')) { $Categorized['feat'].Count } else { 0 }
    $fixCount = if ($Categorized.ContainsKey('fix')) { $Categorized['fix'].Count } else { 0 }

    if ($featureCount -gt 0) {
        [void]$sb.AppendLine("- **$featureCount new features** - Enhancement and new capabilities")
    }
    if ($fixCount -gt 0) {
        [void]$sb.AppendLine("- **$fixCount bug fixes** - Stability and reliability improvements")
    }
    if ($BreakingChanges.Count -gt 0) {
        [void]$sb.AppendLine("- **Deprecated modules removed** - Clean codebase, reduced maintenance")
    }
    [void]$sb.AppendLine("- **Complete documentation** - Release report, migration guide, cleanup audit")
    [void]$sb.AppendLine()

    # Installation section
    [void]$sb.AppendLine("### 📦 Installation")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Windows:** Download \`SMS_Installer_${Version}.exe\` from the assets below.")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Docker:**")
    [void]$sb.AppendLine("``powershell")
    [void]$sb.AppendLine(".\DOCKER.ps1 -Update")
    [void]$sb.AppendLine("``")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("**Native (Development):**")
    [void]$sb.AppendLine("``powershell")
    [void]$sb.AppendLine(".\NATIVE.ps1 -Start")
    [void]$sb.AppendLine("``")
    [void]$sb.AppendLine()

    # Documentation links
    [void]$sb.AppendLine("### 📚 Documentation")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("- **[Migration Guide](docs/guides/MIGRATION_v${Version}.md)** - How to update your code")
    [void]$sb.AppendLine("- **[Release Report](docs/releases/reports/RELEASE_REPORT_v${Version}.md)** - Executive summary and impact assessment")
    [void]$sb.AppendLine("- **[Cleanup Report](docs/releases/reports/CLEANUP_EXECUTION_REPORT_v${Version}.md)** - Detailed cleanup audit")
    [void]$sb.AppendLine("- **[CHANGELOG](CHANGELOG.md)** - Full commit history")
    [void]$sb.AppendLine()

    return $sb.ToString()
}

# Generate the documentation
$description = Get-ComprehensiveGitHubReleaseDescription -Version $Version -BreakingChanges $BreakingChanges -Categorized $Categorized

# Output to file if path provided
if ($OutputPath) {
    $description | Out-File -FilePath $OutputPath -Encoding UTF8 -NoNewline
    Write-Host "✓ Generated: $OutputPath" -ForegroundColor Green
} else {
    $description
}
