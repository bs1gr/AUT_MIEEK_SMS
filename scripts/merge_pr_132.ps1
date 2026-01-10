# Merge PR #132 - Option 1 Strategy
# This script automates the merge process using temporary enforce_admins disable

Write-Host "Preparing to merge PR #132..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Wait for CI to complete
Write-Host "Step 1: Checking CI status..." -ForegroundColor Yellow
$pendingCount = gh pr view 132 --json statusCheckRollup --jq '[.statusCheckRollup[] | select(.conclusion == "")] | length' | ConvertFrom-Json

while ($pendingCount -gt 0) {
    Write-Host "  $pendingCount checks still pending... waiting 30 seconds" -ForegroundColor Gray
    Start-Sleep -Seconds 30
    $pendingCount = gh pr view 132 --json statusCheckRollup --jq '[.statusCheckRollup[] | select(.conclusion == "")] | length' | ConvertFrom-Json
}

Write-Host "  ✓ All CI checks complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Check for failures
Write-Host "Step 2: Checking for failures..." -ForegroundColor Yellow
$failedCount = gh pr view 132 --json statusCheckRollup --jq '[.statusCheckRollup[] | select(.conclusion == "FAILURE")] | length' | ConvertFrom-Json

if ($failedCount -gt 0) {
    Write-Host "  ✗ $failedCount checks failed!" -ForegroundColor Red
    gh pr view 132 --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion == "FAILURE") | .name'
    Write-Host ""
    Write-Host "Cannot merge PR with failing checks. Fix the failures and try again." -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ No failures detected!" -ForegroundColor Green
Write-Host ""

# Step 3: Disable enforce_admins
Write-Host "Step 3: Temporarily disabling enforce_admins..." -ForegroundColor Yellow
gh api -X DELETE repos/bs1gr/AUT_MIEEK_SMS/branches/main/protection/enforce_admins | Out-Null
Write-Host "  ✓ enforce_admins disabled" -ForegroundColor Green
Write-Host ""

# Step 4: Merge PR
Write-Host "Step 4: Merging PR #132..." -ForegroundColor Yellow
try {
    gh pr merge 132 --admin --squash --delete-branch
    Write-Host "  ✓ PR merged successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Merge failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Re-enabling enforce_admins before exit..." -ForegroundColor Yellow
    gh api -X POST repos/bs1gr/AUT_MIEEK_SMS/branches/main/protection/enforce_admins | Out-Null
    exit 1
}
Write-Host ""

# Step 5: Re-enable enforce_admins
Write-Host "Step 5: Re-enabling enforce_admins..." -ForegroundColor Yellow
$response = gh api -X POST repos/bs1gr/AUT_MIEEK_SMS/branches/main/protection/enforce_admins | ConvertFrom-Json
if ($response.enabled -eq $true) {
    Write-Host "  ✓ enforce_admins re-enabled and verified" -ForegroundColor Green
} else {
    Write-Host "  ✗ Warning: enforce_admins may not be enabled!" -ForegroundColor Red
}
Write-Host ""

# Step 6: Sync local repository
Write-Host "Step 6: Syncing local repository..." -ForegroundColor Yellow
git checkout main
git pull --rebase origin main
Write-Host "  ✓ Local repository synced" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PR #132 MERGE COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure CODECOV_TOKEN secret in repository settings"
Write-Host "  2. Verify coverage uploads in next CI run"
Write-Host "  3. Update branch protection to include codecov checks"
Write-Host ""
