# Script to allowlist false positives for detect-secrets
# Run from repository root: .\scripts\allowlist_secrets.ps1
$ErrorActionPreference = 'Stop'

$fixes = @(
    @{ Path = "load_tests/locustfile.py"; Line = 15; Type = "py" },
    @{ Path = "backend/tools/check_secret.py"; Line = 20; Type = "py" },
    @{ Path = "backend/schemas/audit.py"; Line = 18; Type = "py" },
    @{ Path = "scripts/utils/post_register.py"; Line = 7; Type = "py" },
    @{ Path = "frontend/src/contexts/AuthContext.test.tsx"; Line = 90; Type = "ts" },
    @{ Path = "frontend/src/hooks/useFormValidation.test.ts"; Line = 227; Type = "ts" },
    @{ Path = "frontend/src/hooks/useFormValidation.test.ts"; Line = 228; Type = "ts" }
)

foreach ($fix in $fixes) {
    $fullPath = Join-Path (Get-Location) $fix.Path
    if (Test-Path $fullPath) {
        $lines = Get-Content $fullPath
        $idx = $fix.Line - 1
        if ($idx -ge 0 -and $idx -lt $lines.Count) {
            $comment = if ($fix.Type -eq "py") { "  # pragma: allowlist secret" } else { "  // pragma: allowlist secret" }
            if ($lines[$idx] -notmatch "pragma: allowlist secret") {
                $lines[$idx] = $lines[$idx] + $comment
                $lines | Set-Content $fullPath -Encoding UTF8
                Write-Host "Fixed: $($fix.Path)" -ForegroundColor Green
            } else {
                Write-Host "Skipped (already allowlisted): $($fix.Path)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "File not found: $($fix.Path)" -ForegroundColor Yellow
    }
}

# Update the secrets baseline to handle files that don't support inline comments (e.g. JSON)
if (Get-Command "detect-secrets" -ErrorAction SilentlyContinue) {
    Write-Host "Updating secrets baseline (handles JSON/non-code files)..." -ForegroundColor Cyan
    # Try modern syntax first; if it fails (e.g. old version), regenerate
    detect-secrets scan --update .secrets.baseline 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Baseline updated successfully." -ForegroundColor Green
    } else {
        Write-Host "Update failed (likely version mismatch). Regenerating baseline..." -ForegroundColor Yellow
        detect-secrets scan > .secrets.baseline
        Write-Host "Baseline regenerated." -ForegroundColor Green
    }

    # Post-process baseline to ensure forward slashes (fixes Windows/Git path mismatch in pre-commit)
    if (Test-Path .secrets.baseline) {
        try {
            $content = Get-Content .secrets.baseline -Raw
            $json = $content | ConvertFrom-Json
            $newResults = [Ordered]@{}

            # Normalize paths in results keys and filename properties
            foreach ($prop in $json.results.PSObject.Properties) {
                $oldPath = $prop.Name
                $newPath = $oldPath -replace '\\', '/'

                $items = $prop.Value
                foreach ($item in $items) {
                    if ($item.filename) {
                        $item.filename = $item.filename -replace '\\', '/'
                    }
                }
                $newResults[$newPath] = $items
            }
            $json.results = $newResults

            # Save with sufficient depth to preserve structure
            $json | ConvertTo-Json -Depth 100 | Set-Content .secrets.baseline -Encoding UTF8
            Write-Host "Normalized paths in .secrets.baseline to forward slashes." -ForegroundColor Green
        } catch {
            Write-Warning "Failed to normalize paths in .secrets.baseline: $_"
        }
    }
}
