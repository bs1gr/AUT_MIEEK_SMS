# Script to fix TypeScript implicit 'any' errors in analytics hooks
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"

function Update-File {
    param($Path, $Regex, $Replacement)
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        if ($content -match $Regex) {
            $newContent = $content -replace $Regex, $Replacement
            Set-Content -Path $Path -Value $newContent -Encoding UTF8
            Write-Host "Updated $Path" -ForegroundColor Green
        }
    } else {
        Write-Host "File not found: $Path" -ForegroundColor Yellow
    }
}

# 1. Fix usePerformanceMonitor.ts
$perfMonitor = Join-Path $FrontendDir "src/hooks/usePerformanceMonitor.ts"
# Fix callback parameter type
Update-File $perfMonitor 'callback\)' 'callback: () => void)'
Update-File $perfMonitor 'callback,' 'callback: () => void,'

# 2. Fix useAnalytics.ts
$useAnalytics = Join-Path $FrontendDir "src/features/analytics/hooks/useAnalytics.ts"
# Fix studentId parameter
Update-File $useAnalytics 'studentId\)' 'studentId: number)'
Update-File $useAnalytics 'studentId,' 'studentId: number,'

Write-Host "Analytics type fixes applied." -ForegroundColor Cyan
