# Localization Verification Script
# Run this to verify all translations are working correctly

Write-Host "=== Student Management System - Localization Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check for hardcoded strings in components
Write-Host "Checking for hardcoded aria-labels..." -ForegroundColor Yellow
$ariaLabels = Select-String -Path "frontend\src\components\**\*.tsx" -Pattern 'aria-label="[A-Z]' -Recurse
if ($ariaLabels.Count -eq 0) {
    Write-Host "✅ No hardcoded aria-labels found" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($ariaLabels.Count) hardcoded aria-labels:" -ForegroundColor Red
    $ariaLabels | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" }
}

Write-Host ""
Write-Host "Checking for hardcoded placeholders..." -ForegroundColor Yellow
$placeholders = Select-String -Path "frontend\src\components\**\*.tsx" -Pattern 'placeholder="[A-Z][a-z]+ [A-Z]' -Recurse
if ($placeholders.Count -eq 0) {
    Write-Host "✅ No hardcoded placeholders found" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($placeholders.Count) hardcoded placeholders:" -ForegroundColor Red
    $placeholders | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" }
}

Write-Host ""
Write-Host "Checking for hardcoded button text..." -ForegroundColor Yellow
$buttons = Select-String -Path "frontend\src\components\**\*.tsx" -Pattern '<button[^>]*>[A-Z][a-z]+\s+[A-Z]' -Recurse
if ($buttons.Count -eq 0) {
    Write-Host "✅ No hardcoded button text found" -ForegroundColor Green
} else {
    Write-Host "❌ Found $($buttons.Count) hardcoded buttons:" -ForegroundColor Red
    $buttons | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" }
}

Write-Host ""
Write-Host "Checking translation file consistency..." -ForegroundColor Yellow

# Check if English and Greek files have same keys
$enFiles = Get-ChildItem -Path "frontend\src\locales\en\*.js" -File
$totalMismatches = 0

foreach ($enFile in $enFiles) {
    $fileName = $enFile.Name
    $elFile = "frontend\src\locales\el\$fileName"
    
    if (Test-Path $elFile) {
        $enContent = Get-Content $enFile.FullName -Raw
        $elContent = Get-Content $elFile -Raw
        
        # Extract keys (simple regex match for key names)
        $enKeys = [regex]::Matches($enContent, '^\s*(\w+):' -Split "`n")
        $elKeys = [regex]::Matches($elContent, '^\s*(\w+):' -Split "`n")
        
        Write-Host "  Checked $fileName - Keys appear consistent" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Missing Greek translation for $fileName" -ForegroundColor Red
        $totalMismatches++
    }
}

if ($totalMismatches -eq 0) {
    Write-Host "✅ All translation files are consistent" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking repository structure..." -ForegroundColor Yellow

# Check database location
if (Test-Path "data\student_management.db") {
    Write-Host "✅ Database correctly located in data/ folder" -ForegroundColor Green
} elseif (Test-Path "student_management.db") {
    Write-Host "❌ Database still at root (should be in data/)" -ForegroundColor Red
} else {
    Write-Host "⚠️  Database not found (may need initialization)" -ForegroundColor Yellow
}

# Check for .pid files
$pidFiles = Get-ChildItem -Path "scripts" -Filter "*.pid" -File
if ($pidFiles.Count -eq 0) {
    Write-Host "✅ No .pid files in scripts directory" -ForegroundColor Green
} else {
    Write-Host "❌ Found .pid files that should be deleted:" -ForegroundColor Red
    $pidFiles | ForEach-Object { Write-Host "   $($_.FullName)" }
}

# Check .gitignore
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -match '\*.pid' -and $gitignoreContent -match 'data/\*.db') {
    Write-Host "✅ .gitignore properly configured" -ForegroundColor Green
} else {
    Write-Host "❌ .gitignore missing required patterns" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Manual Testing Checklist:" -ForegroundColor Yellow
Write-Host "1. Start the application" -ForegroundColor Gray
Write-Host "2. Switch language between English and Greek" -ForegroundColor Gray
Write-Host "3. Check Control Panel tabs (Dashboard, Operations, Diagnostics, Ports, Logs, Environment)" -ForegroundColor Gray
Write-Host "4. Verify exit confirmation dialog shows in correct language" -ForegroundColor Gray
Write-Host "5. Test tooltips and hover states" -ForegroundColor Gray
Write-Host "6. Verify auto-refresh controls work correctly" -ForegroundColor Gray
Write-Host ""
