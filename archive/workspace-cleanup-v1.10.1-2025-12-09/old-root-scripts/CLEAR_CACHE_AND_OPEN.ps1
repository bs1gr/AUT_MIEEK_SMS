# Force clear browser cache and open SMS in fresh browser
Write-Host "🔧 Clearing browser cache..." -ForegroundColor Cyan

# Kill all browser processes to ensure cache is cleared
$browsers = @("chrome", "msedge", "firefox", "iexplore")
foreach ($browser in $browsers) {
    Get-Process -Name $browser -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Clear Chrome cache
$chromePaths = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache",
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\GPUCache"
)

foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Cleared: $path" -ForegroundColor Green
    }
}

# Clear Edge cache
$edgePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache",
    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\GPUCache"
)

foreach ($path in $edgePaths) {
    if (Test-Path $path) {
        Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Cleared: $path" -ForegroundColor Green
    }
}

Write-Host "`n✅ Browser cache cleared!" -ForegroundColor Green
Write-Host "🌐 Opening SMS in incognito mode..." -ForegroundColor Cyan

Start-Sleep -Seconds 1

# Try to open in incognito/private mode
$opened = $false

# Try Chrome
$chrome = Get-Command chrome.exe -ErrorAction SilentlyContinue
if ($chrome) {
    Start-Process "chrome.exe" -ArgumentList "--incognito", "--new-window", "http://localhost:8080"
    $opened = $true
    Write-Host "  ✓ Opened in Chrome Incognito" -ForegroundColor Green
}
# Try Edge
elseif (Get-Command msedge.exe -ErrorAction SilentlyContinue) {
    Start-Process "msedge.exe" -ArgumentList "--inprivate", "--new-window", "http://localhost:8080"
    $opened = $true
    Write-Host "  ✓ Opened in Edge InPrivate" -ForegroundColor Green
}
# Try Firefox
elseif (Get-Command firefox.exe -ErrorAction SilentlyContinue) {
    Start-Process "firefox.exe" -ArgumentList "-private-window", "http://localhost:8080"
    $opened = $true
    Write-Host "  ✓ Opened in Firefox Private Window" -ForegroundColor Green
}

if (-not $opened) {
    # Fallback: just open normally
    Start-Process "http://localhost:8080"
    Write-Host "  ✓ Opened in default browser" -ForegroundColor Yellow
}

Write-Host "`n✨ Done! The SMS application should now display correctly with all styling." -ForegroundColor Green
Write-Host "   If you still see issues, press Ctrl+Shift+Delete in the browser" -ForegroundColor Yellow
Write-Host "   and manually clear 'Cached images and files', then reload." -ForegroundColor Yellow
