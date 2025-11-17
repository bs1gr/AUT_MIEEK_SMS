# SUPER_CLEAN_AND_DEPLOY.ps1
# Full workspace cleanup aligned with latest tooling: Docker services, caches, logs,
# node_modules, virtual environments, temp artifacts, and aged backups.

param(
    [switch]$SkipDockerPrune,
    [ValidateSet('Prompt','Native','Docker','None')]
    [string]$SetupMode = 'None',
    [switch]$StartServices,
    [switch]$ForceInstall
)

$script:cleaned = @()
$script:errors = @()
$script:totalSize = 0
$script:setupActions = @()
$script:setupErrors = @()
$script:startServicesPreference = $null
if ($PSBoundParameters.ContainsKey('StartServices')) {
    $script:startServicesPreference = [bool]$StartServices
}
$script:backendPort = $null
$script:frontendPort = $null
$script:ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location $script:ScriptRoot

try {
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "  SUPER CLEAN & DEPLOY SCRIPT" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Workspace root: $script:ScriptRoot" -ForegroundColor DarkGray
    Write-Host ""

    function Convert-ToRelativePath {
        param([string]$Path)
        if ([string]::IsNullOrWhiteSpace($Path)) { return $Path }

        $normalizedRoot = [System.IO.Path]::GetFullPath($script:ScriptRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath($Path)

        if ($fullPath.StartsWith($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $relative = $fullPath.Substring($normalizedRoot.Length)
            if ($relative.StartsWith([System.IO.Path]::DirectorySeparatorChar)) {
                $relative = $relative.Substring(1)
            }
            if ([string]::IsNullOrWhiteSpace($relative)) { return "." }
            return ".\$relative"
        }

        return $Path
    }

    function Remove-SafeItem {
        param(
            [string]$Path,
            [string]$Description,
            [switch]$Quiet,
            [switch]$SkipSummary
        )

        $resolvedPath = if ([System.IO.Path]::IsPathRooted($Path)) {
            $Path
        } else {
            Join-Path -Path $script:ScriptRoot -ChildPath $Path
        }

        if (-not (Test-Path -LiteralPath $resolvedPath)) {
            $label = if ($Description) { $Description } else { Convert-ToRelativePath $resolvedPath }
            Write-Host "○ Not found: $label" -ForegroundColor Gray
            return
        }

        $item = Get-Item -LiteralPath $resolvedPath -Force

        try {
            if ($item.PSIsContainer) {
                $size = (Get-ChildItem -LiteralPath $resolvedPath -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            } else {
                $size = $item.Length
            }
            if ($null -eq $size) { $size = 0 }

            Remove-Item -LiteralPath $resolvedPath -Recurse -Force -ErrorAction Stop

            $sizeMB = if ($size -gt 0) { [math]::Round($size / 1MB, 2) } else { 0 }
            $label = if ($Description) { $Description } else { Convert-ToRelativePath $resolvedPath }
            $script:totalSize += $size
            if (-not $SkipSummary) {
                $script:cleaned += "$label ($sizeMB MB)"
            }
            if (-not $Quiet) {
                Write-Host "✓ Removed: $label" -ForegroundColor Green
            }

            return [pscustomobject]@{
                Success      = $true
                Label        = $label
                SizeBytes    = $size
                ErrorMessage = $null
            }
        }
        catch {
            $label = if ($Description) { $Description } else { Convert-ToRelativePath $resolvedPath }
            $script:errors += "$label - $($_.Exception.Message)"
            if (-not $Quiet) {
                Write-Host "✗ Failed: $label - $($_.Exception.Message)" -ForegroundColor Red
            }

            return [pscustomobject]@{
                Success      = $false
                Label        = $label
                SizeBytes    = 0
                ErrorMessage = $_.Exception.Message
            }
        }
    }

    function Remove-DirectoriesByName {
        param(
            [string[]]$Names,
            [string]$Heading,
            [string]$Label,
            [switch]$Quiet
        )

        if (-not $Names -or $Names.Count -eq 0) { return }

        Write-Host $Heading -ForegroundColor Cyan

        $directories = @()
        foreach ($name in $Names) {
            $rootMatches = Get-ChildItem -Path $script:ScriptRoot -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $name }
            $nestedMatches = Get-ChildItem -Path $script:ScriptRoot -Recurse -Directory -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $name }
            $directories += $rootMatches
            $directories += $nestedMatches
        }

        $uniqueDirectories = $directories | Sort-Object -Property FullName -Unique

        if ($uniqueDirectories.Count -eq 0) {
            Write-Host "○ Nothing found for $($Names -join ', ')" -ForegroundColor Gray
            Write-Host ""
            return
        }

        $results = foreach ($dir in $uniqueDirectories) {
            $desc = "${Label}: $(Convert-ToRelativePath $dir.FullName)"
            Remove-SafeItem -Path $dir.FullName -Description $desc -Quiet:$Quiet -SkipSummary:$Quiet
        }

        if ($Quiet) {
            $successes = $results | Where-Object { $_.Success }
            $failures = $results | Where-Object { -not $_.Success }
            $successCount = ($successes | Measure-Object).Count
            $totalBytes = ($successes | Measure-Object -Property SizeBytes -Sum).Sum
            $aggregateMB = if ($totalBytes -gt 0) { [math]::Round($totalBytes / 1MB, 2) } else { 0 }

            if ($successCount -gt 0) {
                $script:cleaned += "$Label (group) - removed $successCount item(s) ($aggregateMB MB)"
                Write-Host "✓ Removed $successCount item(s) for $($Names -join ', ')" -ForegroundColor Green
            } else {
                Write-Host "○ No items removed for $($Names -join ', ')" -ForegroundColor Gray
            }

            foreach ($failure in $failures) {
                Write-Host "✗ Failed: $($failure.Label) - $($failure.ErrorMessage)" -ForegroundColor Yellow
            }
        }

        Write-Host ""
    }

    function Cleanup-Targets {
        param(
            [array]$Targets,
            [string]$Heading
        )

        if (-not $Targets -or $Targets.Count -eq 0) { return }

        Write-Host $Heading -ForegroundColor Cyan
        foreach ($target in $Targets) {
            [void](Remove-SafeItem -Path $target.Path -Description $target.Description)
        }
        Write-Host ""
    }

    function Test-CommandExists {
        param([string]$Name)
        try {
            $null = Get-Command -Name $Name -ErrorAction Stop
            return $true
        }
        catch {
            return $false
        }
    }

    function Resolve-SetupMode {
        param([string]$Mode)

        switch ($Mode.ToLowerInvariant()) {
            'native' { return 'Native' }
            'docker' { return 'Docker' }
            'prompt' { return (Prompt-SetupModeSelection) }
            default { return 'None' }
        }
    }

    function Test-PortAvailable {
        param(
            [int]$Port,
            [string]$TargetHost = '127.0.0.1'
        )

        $listener = $null
        try {
            $ipAddress = if ($TargetHost -eq '0.0.0.0') { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Parse($TargetHost) }
            $listener = New-Object System.Net.Sockets.TcpListener($ipAddress, $Port)
            $listener.Start()
            return $true
        }
        catch {
            return $false
        }
        finally {
            if ($listener) {
                try { $listener.Stop() } catch { }
            }
        }
    }

    function Find-AvailablePort {
        param(
            [int[]]$PreferredPorts,
            [string]$TargetHost = '127.0.0.1'
        )

        foreach ($port in $PreferredPorts) {
            if (Test-PortAvailable -Port $port -TargetHost $TargetHost) {
                return $port
            }
        }

        throw "No available port found in range: $($PreferredPorts -join ', ')"
    }

    function Prompt-SetupModeSelection {
        Write-Host "" 
        Write-Host "Post-clean setup options:" -ForegroundColor Cyan
        Write-Host "  1) Native developer setup (rebuild virtualenv, install deps) [default]" -ForegroundColor Gray
        Write-Host "  2) Docker fullstack setup (build/start containers)" -ForegroundColor Gray
        Write-Host "  3) Skip additional setup" -ForegroundColor Gray

        while ($true) {
            $selection = Read-Host "Select option [1-3] (Enter for default)"
            if ($null -eq $selection) { $selection = '' }
            switch ($selection.Trim()) {
                '' { return 'Native' }
                '1' { return 'Native' }
                '2' { return 'Docker' }
                '3' { return 'None' }
                default { Write-Host "⚠ Invalid selection. Please choose 1, 2, or 3." -ForegroundColor Yellow }
            }
        }
    }

    function Ensure-EnvFileFromTemplate {
        param([string]$Directory)

        $envFile = Join-Path $Directory '.env'
        $template = Join-Path $Directory '.env.example'

        if (-not (Test-Path -LiteralPath $envFile) -and (Test-Path -LiteralPath $template)) {
            Copy-Item -LiteralPath $template -Destination $envFile -Force
            $relative = Convert-ToRelativePath $envFile
            Write-Host "✓ Created $relative from template" -ForegroundColor Green
            $script:setupActions += "Created $relative from template"
        }
    }

    function Get-PythonExecutable {
        $cmd = Get-Command -Name 'python' -ErrorAction SilentlyContinue
        if ($null -eq $cmd) { return $null }
        return $cmd.Source
    }

    function New-BackendVirtualEnv {
        param([string]$PythonExe)

        $venvPath = Join-Path $script:ScriptRoot 'backend/.venv'
        if (Test-Path -LiteralPath $venvPath) {
            Remove-Item -LiteralPath $venvPath -Recurse -Force -ErrorAction SilentlyContinue
        }

        Write-Host "Creating backend virtual environment..." -ForegroundColor Cyan
        & $PythonExe -m venv $venvPath

    $osIsWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $venvPython = if ($osIsWindows) {
            Join-Path $venvPath 'Scripts/python.exe'
        } else {
            Join-Path $venvPath 'bin/python'
        }

        if (-not (Test-Path -LiteralPath $venvPython)) {
            throw "Virtual environment Python executable not found at $venvPython"
        }

        $script:setupActions += "Created backend virtual environment (backend/.venv)"
        return $venvPython
    }

    function Upgrade-VenvPip {
        param([string]$PythonExe)

        Write-Host "Checking pip version..." -ForegroundColor Cyan
        $currentVersion = & $PythonExe -m pip --version 2>&1 | Select-String -Pattern 'pip ([0-9.]+)' | ForEach-Object { $_.Matches.Groups[1].Value }
        
        # Check if upgrade is available (quietly)
        $upgradeCheck = & $PythonExe -m pip list --outdated --format=json 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq 'pip' }
        
        if ($upgradeCheck) {
            Write-Host "Upgrading pip from $currentVersion to $($upgradeCheck.latest_version)..." -ForegroundColor Cyan
            & $PythonExe -m pip install --upgrade pip --quiet
            if ($LASTEXITCODE -ne 0) {
                throw "pip upgrade failed (exit code $LASTEXITCODE)."
            }
            $script:setupActions += "Upgraded pip from $currentVersion to $($upgradeCheck.latest_version)"
        } else {
            Write-Host "pip $currentVersion is already up to date" -ForegroundColor Green
            $script:setupActions += "pip $currentVersion already up to date (skipped upgrade)"
        }
    }

    function Install-BackendDependencies {
        param([string]$PythonExe)

        $backendDir = Join-Path $script:ScriptRoot 'backend'
        Push-Location $backendDir
        try {
            Write-Host "Installing backend runtime dependencies (requirements.txt) in quiet mode..." -ForegroundColor Cyan
            & $PythonExe -m pip install -r requirements.txt --quiet --disable-pip-version-check
            if ($LASTEXITCODE -ne 0) {
                throw "pip install for requirements.txt failed (exit code $LASTEXITCODE)."
            }
            $script:setupActions += "Installed backend dependencies (requirements.txt)"

            if (Test-Path -LiteralPath 'requirements-dev.txt') {
                Write-Host "Installing backend development dependencies (requirements-dev.txt) in quiet mode..." -ForegroundColor Cyan
                & $PythonExe -m pip install -r requirements-dev.txt --quiet --disable-pip-version-check
                if ($LASTEXITCODE -ne 0) {
                    throw "pip install for requirements-dev.txt failed (exit code $LASTEXITCODE)."
                }
                $script:setupActions += "Installed backend dev dependencies (requirements-dev.txt)"
            }
        }
        finally {
            Pop-Location
        }
    }

    function Run-BackendMigrations {
        param([string]$PythonExe)

        $backendDir = Join-Path $script:ScriptRoot 'backend'
        Push-Location $backendDir
        try {
            Write-Host "Running Alembic migrations..." -ForegroundColor Cyan
            & $PythonExe -m alembic upgrade head
            $script:setupActions += "Applied database migrations (alembic upgrade head)"
        }
        finally {
            Pop-Location
        }
    }

    function Install-FrontendDependencies {
        param([switch]$UseCleanInstall)

        if (-not (Test-CommandExists -Name 'npm')) {
            $script:setupErrors += 'npm command not found; frontend dependencies were not installed.'
            Write-Host "⚠ npm not found. Skipping frontend dependency installation." -ForegroundColor Yellow
            return $false
        }

        $frontendDir = Join-Path $script:ScriptRoot 'frontend'
        Push-Location $frontendDir
        try {
            $hasLock = Test-Path -LiteralPath 'package-lock.json'
            $runCi = $hasLock -or $UseCleanInstall

            if ($runCi -and $hasLock) {
                Write-Host "Reinstalling frontend dependencies (npm ci) after cleanup..." -ForegroundColor Cyan
                npm ci --no-audit --silent --progress false
            }
            elseif ($runCi) {
                Write-Host "Performing clean install without lockfile (npm install --force)..." -ForegroundColor Cyan
                npm install --no-audit --silent --progress false --force
            }
            else {
                Write-Host "Installing/refreshing frontend dependencies (npm install)..." -ForegroundColor Cyan
                npm install --no-audit --silent --progress false
            }

            if ($LASTEXITCODE -ne 0) {
                throw "npm dependency installation failed (exit code $LASTEXITCODE)."
            }

            $script:setupActions += "Restored frontend dependencies (npm)"

            Write-Host "Running production build to verify frontend integrity (npm run build)..." -ForegroundColor Cyan
            npm run build -- --emptyOutDir
            if ($LASTEXITCODE -ne 0) {
                throw "npm run build failed (exit code $LASTEXITCODE)."
            }

            $script:setupActions += "Verified frontend via npm run build"
        }
        finally {
            Pop-Location
        }

        return $true
    }

    function Wait-HttpReady {
        param([string[]]$Urls, [int]$TimeoutSeconds = 60)

        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline) {
            foreach ($url in $Urls) {
                try {
                    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 3
                    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                        return [pscustomobject]@{
                            Url = $url
                            Response = $response
                        }
                    }
                }
                catch {
                    # retry
                }
            }
            Start-Sleep -Seconds 2
        }
        return $null
    }

    function Start-NativeBackend {
        param([string]$PythonExe, [switch]$Reload)

        $preferredPorts = 8000..8010
        try {
            $selectedPort = Find-AvailablePort -PreferredPorts $preferredPorts
        }
        catch {
            $script:setupErrors += $_.Exception.Message
            throw
        }

        $args = @('-m','uvicorn','backend.main:app','--host','127.0.0.1','--port',$selectedPort)
        if ($Reload) { $args += '--reload' }

        $backendLogOut = Join-Path $script:ScriptRoot 'backend_dev_output.log'
        $backendLogErr = Join-Path $script:ScriptRoot 'backend_dev_error.log'
        Remove-Item -LiteralPath $backendLogOut -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $backendLogErr -ErrorAction SilentlyContinue

        $proc = Start-Process -FilePath $PythonExe -ArgumentList $args -WorkingDirectory $script:ScriptRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $backendLogOut -RedirectStandardError $backendLogErr
        Start-Sleep -Seconds 2
        if ($proc.HasExited) {
            $message = "Backend dev server exited immediately (code $($proc.ExitCode)). Check backend_dev_error.log."
            $script:setupErrors += $message
            Write-Host "✗ $message" -ForegroundColor Red
            return $null
        }

        $pidFile = Join-Path $script:ScriptRoot '.backend.pid'
        Set-Content -LiteralPath $pidFile -Value $proc.Id
        $script:backendPort = $selectedPort
        $script:setupActions += "Started backend dev server on port $selectedPort (PID $($proc.Id))"
        Write-Host "✓ Backend server started on port $selectedPort (PID $($proc.Id))" -ForegroundColor Green
        return [pscustomobject]@{
            Process = $proc
            Port = $selectedPort
        }
    }

    function Start-NativeFrontend {
        param([string]$NpmExe)

        $preferredPorts = 5173..5183
        try {
            $selectedPort = Find-AvailablePort -PreferredPorts $preferredPorts
        }
        catch {
            $script:setupErrors += $_.Exception.Message
            throw
        }

        $frontendDir = Join-Path $script:ScriptRoot 'frontend'
        $frontendLogOut = Join-Path $script:ScriptRoot 'frontend_dev_output.log'
        $frontendLogErr = Join-Path $script:ScriptRoot 'frontend_dev_error.log'
        Remove-Item -LiteralPath $frontendLogOut -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $frontendLogErr -ErrorAction SilentlyContinue

        $escapedNpm = '"{0}"' -f $NpmExe
        $commandLine = "$escapedNpm run dev -- --host 127.0.0.1 --port $selectedPort --strictPort"
        $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/s','/c', $commandLine -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $frontendLogOut -RedirectStandardError $frontendLogErr
        Start-Sleep -Seconds 2
        if ($proc.HasExited) {
            $message = "Frontend dev server exited immediately (code $($proc.ExitCode)). Check frontend_dev_error.log."
            $script:setupErrors += $message
            Write-Host "✗ $message" -ForegroundColor Red
            return $null
        }

        $pidFile = Join-Path $script:ScriptRoot '.frontend.pid'
        Set-Content -LiteralPath $pidFile -Value $proc.Id
        $script:frontendPort = $selectedPort
        $script:setupActions += "Started frontend dev server on port $selectedPort (PID $($proc.Id))"
        Write-Host "✓ Frontend dev server started on port $selectedPort (PID $($proc.Id))" -ForegroundColor Green
        return [pscustomobject]@{
            Process = $proc
            Port = $selectedPort
        }
    }

    function Invoke-NativeSetup {
        Write-Host "" 
        Write-Host "=== Native Developer Setup ===" -ForegroundColor Cyan

        $pythonExe = Get-PythonExecutable
        if (-not $pythonExe) {
            $msg = 'Python executable not found. Install Python 3.11+ and retry the setup.'
            Write-Host "✗ $msg" -ForegroundColor Red
            $script:setupErrors += $msg
            return
        }
        Write-Host "Using Python: $pythonExe" -ForegroundColor Gray

        try {
            $venvPython = New-BackendVirtualEnv -PythonExe $pythonExe
        }
        catch {
            $script:setupErrors += "Virtual environment creation failed: $($_.Exception.Message)"
            Write-Host "✗ Failed to create virtual environment: $($_.Exception.Message)" -ForegroundColor Red
            return
        }

        try {
            Upgrade-VenvPip -PythonExe $venvPython
        }
        catch {
            $script:setupErrors += "Failed to upgrade pip: $($_.Exception.Message)"
            Write-Host "⚠ Failed to upgrade pip: $($_.Exception.Message)" -ForegroundColor Yellow
        }

        try {
            Install-BackendDependencies -PythonExe $venvPython
        }
        catch {
            $script:setupErrors += "Failed to install backend dependencies: $($_.Exception.Message)"
            Write-Host "✗ Backend dependency installation failed: $($_.Exception.Message)" -ForegroundColor Red
            return
        }

    Ensure-EnvFileFromTemplate -Directory (Join-Path $script:ScriptRoot 'backend')

        try {
            Run-BackendMigrations -PythonExe $venvPython
        }
        catch {
            $script:setupErrors += "Database migrations failed: $($_.Exception.Message)"
            Write-Host "⚠ Failed to apply database migrations: $($_.Exception.Message)" -ForegroundColor Yellow
        }

    Ensure-EnvFileFromTemplate -Directory (Join-Path $script:ScriptRoot 'frontend')

        $frontendReady = $false
        try {
            $frontendReady = Install-FrontendDependencies -UseCleanInstall:$ForceInstall
        }
        catch {
            $script:setupErrors += "Frontend dependency installation failed: $($_.Exception.Message)"
            Write-Host "⚠ Frontend dependency installation failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }

        $shouldStartServices = $false
        if ($null -ne $script:startServicesPreference) {
            $shouldStartServices = $script:startServicesPreference
        }
        else {
            $reply = Read-Host "Start backend/frontend dev servers now? [y/N]"
            if ($reply) {
                $shouldStartServices = $reply.Trim().ToLowerInvariant() -in @('y','yes')
            }
        }

        if (-not $shouldStartServices) {
            Write-Host "Skipping service startup. Use 'backend/.venv/Scripts/python -m uvicorn backend.main:app --reload' and 'npm run dev' when ready." -ForegroundColor Gray
            return
        }

        $backendInfo = $null
        try {
            $backendInfo = Start-NativeBackend -PythonExe $venvPython -Reload
        }
        catch {
            $script:setupErrors += "Failed to start backend dev server: $($_.Exception.Message)"
            Write-Host "✗ Failed to start backend dev server: $($_.Exception.Message)" -ForegroundColor Red
        }

        if ($null -ne $backendInfo) {
            $backendUrlBase = "http://127.0.0.1:$($backendInfo.Port)"
            $health = Wait-HttpReady -Urls @("$backendUrlBase/health","http://localhost:$($backendInfo.Port)/health") -TimeoutSeconds 60
            if ($health) {
                try {
                    $json = $health.Response.Content | ConvertFrom-Json
                    $status = $json.status
                    $env = $json.environment
                    Write-Host "Health check: status=$status, environment=$env" -ForegroundColor Green
                }
                catch {
                    Write-Host "Health endpoint reachable: $($health.Url)" -ForegroundColor Green
                }
            }
            else {
                $script:setupErrors += 'Backend health endpoint did not respond within 60 seconds.'
                Write-Host "⚠ Backend health endpoint did not respond within timeout." -ForegroundColor Yellow
            }
        }

        if ($frontendReady) {
            try {
                $npmCmd = Get-Command -Name npm.cmd -ErrorAction SilentlyContinue
                if (-not $npmCmd) {
                    $npmCmd = Get-Command -Name npm -ErrorAction Stop | Where-Object { $_.CommandType -eq 'Application' } | Select-Object -First 1
                }

                if (-not $npmCmd) {
                    throw "Unable to locate npm.cmd in PATH."
                }

                $frontendInfo = Start-NativeFrontend -NpmExe $npmCmd.Source
                if ($null -ne $frontendInfo) {
                    # Quick reachability check (best-effort)
                    $frontendCheck = Wait-HttpReady -Urls @("http://localhost:$($frontendInfo.Port)","http://127.0.0.1:$($frontendInfo.Port)") -TimeoutSeconds 30
                    if ($frontendCheck) {
                        Write-Host "Frontend dev server is responding at $($frontendCheck.Url)" -ForegroundColor Green
                    }
                    else {
                        Write-Host "⚠ Frontend dev server not reachable yet; it may still be compiling." -ForegroundColor Yellow
                    }
                }
            }
            catch {
                $script:setupErrors += "Failed to start frontend dev server: $($_.Exception.Message)"
                Write-Host "⚠ Failed to start frontend dev server: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "Frontend dependencies were not installed; skipping frontend startup." -ForegroundColor Yellow
        }
    }

    function Invoke-DockerSetup {
        Write-Host "" 
        Write-Host "=== Docker Setup ===" -ForegroundColor Cyan

        $candidateScripts = @(
            (Join-Path $script:ScriptRoot 'scripts/deploy/SMART_SETUP.ps1'),
            (Join-Path $script:ScriptRoot 'SMART_SETUP.ps1')
        )

        $setupScript = $candidateScripts | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

        if (-not $setupScript) {
            $msg = 'SMART_SETUP.ps1 not found. Unable to run Docker setup.'
            Write-Host "✗ $msg" -ForegroundColor Red
            $script:setupErrors += $msg
            return
        }

        Write-Host "Launching $(Convert-ToRelativePath $setupScript) with Docker preference..." -ForegroundColor Gray
        $arguments = @()
        if ($setupScript -like '*scripts/deploy/SMART_SETUP.ps1') {
            $arguments += '-PreferDocker'
            if ($ForceInstall) { $arguments += '-Force' }
        }
        elseif ($ForceInstall) {
            $arguments += '-Force'
        }

        try {
            & $setupScript @arguments
            $script:setupActions += "Executed Docker setup via $(Convert-ToRelativePath $setupScript)"
        }
        catch {
            $script:setupErrors += "Docker setup script failed: $($_.Exception.Message)"
            Write-Host "✗ Docker setup failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    function Invoke-SetupFlow {
        param([string]$Mode)

        switch ($Mode) {
            'Native' { Invoke-NativeSetup }
            'Docker' { Invoke-DockerSetup }
            default { Write-Host "Skipping post-clean setup (SetupMode=$Mode)." -ForegroundColor Gray }
        }
    }

    # Docker cleanup
    Write-Host "Stopping containerized services..." -ForegroundColor Yellow
    if (Test-CommandExists -Name "docker") {
        try {
            docker compose down --remove-orphans 2>$null | Out-Null
            Write-Host "✓ docker compose down completed" -ForegroundColor Green
        }
        catch {
            Write-Host "○ docker compose down skipped: $($_.Exception.Message)" -ForegroundColor Gray
        }

        try {
            $runningContainers = docker ps -q 2>$null
            if (-not [string]::IsNullOrWhiteSpace($runningContainers)) {
                $runningContainers -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object {
                    docker stop $_ 2>$null | Out-Null
                }
                Write-Host "✓ Active Docker containers stopped" -ForegroundColor Green
            } else {
                Write-Host "○ No active Docker containers detected" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "○ Docker stop skipped: $($_.Exception.Message)" -ForegroundColor Gray
        }

        if (-not $SkipDockerPrune) {
            try {
                docker system prune -af --volumes 2>$null | Out-Null
                Write-Host "✓ Docker system pruned (images, networks, volumes)" -ForegroundColor Green
            }
            catch {
                Write-Host "○ Docker prune skipped: $($_.Exception.Message)" -ForegroundColor Gray
            }
        } else {
            Write-Host "○ Docker prune skipped by parameter" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "○ Docker CLI not available; skipping Docker cleanup" -ForegroundColor Gray
    }

    Write-Host ""

    # ...existing code...

    # Stop running project processes before cleanup (robust, verbose, non-fatal)
    Write-Host "Checking for running project processes..." -ForegroundColor Yellow

    $workspacePath = $script:ScriptRoot.ToLowerInvariant()
    $processCommandKeywords = @(
        'student-management-system',
        'backend.main',
        'frontend',
        'uvicorn',
        'watchfiles',
        'vite',
        'esbuild',
        'npm',
        'pytest',
        'alembic',
        'multiprocessing.spawn'
    )

    $processNameKeywords = @(
        'python',
        'pythonw',
        'uvicorn',
        'node',
        'npm',
        'vite',
        'esbuild',
        'watchfiles'
    )
    $candidateProcesses = @()

    try {
        $candidateProcesses = Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object {
            $cmdLine = $_.CommandLine
            $execPath = $_.ExecutablePath
            $workingDir = $_.WorkingDirectory

            $cmdLower = if ($cmdLine) { $cmdLine.ToLowerInvariant() } else { '' }
            $execLower = if ($execPath) { $execPath.ToLowerInvariant() } else { '' }
            $workLower = if ($workingDir) { $workingDir.ToLowerInvariant() } else { '' }
            $nameLower = if ($_.Name) { $_.Name.ToLowerInvariant() } else { '' }
            $allowedByName = $nameLower -and ($processNameKeywords -contains $nameLower)

            $matchesWorkspace = $false
            if ($allowedByName) {
                $matchesWorkspace = ($cmdLower -and $cmdLower.Contains($workspacePath)) -or
                                     ($execLower -and $execLower.Contains($workspacePath)) -or
                                     ($workLower -and $workLower.Contains($workspacePath))
            }

            $matchesKeyword = $false
            if ($allowedByName -and $cmdLower) {
                foreach ($keyword in $processCommandKeywords) {
                    if ($cmdLower.Contains($keyword)) { $matchesKeyword = $true; break }
                }
            }

            $matchesWorkspace -or $matchesKeyword
        }
    }
    catch {
        Write-Host "⚠ Could not query processes via Win32_Process: $($_.Exception.Message)" -ForegroundColor Yellow
        $candidateProcesses = @()
    }

    if (-not $candidateProcesses -and $workspacePath) {
        $candidateProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
            try {
                $pathLower = if ($_.Path) { $_.Path.ToLowerInvariant() } else { '' }
                $nameLower = if ($_.ProcessName) { $_.ProcessName.ToLowerInvariant() } else { '' }

                $allowedByName = $nameLower -and ($processNameKeywords -contains $nameLower)

                ($allowedByName -and $pathLower -and $pathLower.Contains($workspacePath)) -or
                ($nameLower -and $processNameKeywords -contains $nameLower)
            }
            catch { $false }
        }
    }

    if ($candidateProcesses -and $candidateProcesses.Count -gt 0) {
        Write-Host "Found $($candidateProcesses.Count) running process(es) that may lock files:" -ForegroundColor Yellow

        $processInfo = $candidateProcesses | ForEach-Object {
            $id = $_.ProcessId
            $name = $_.Name
            $exe = $_.ExecutablePath
            $cmd = $_.CommandLine

            if ($null -eq $id) { $id = $_.Id }
            if ($null -eq $name -and $_.ProcessName) { $name = $_.ProcessName }
            if ($null -eq $exe -and $_.Path) { $exe = $_.Path }

            [pscustomobject]@{
                Id = $id
                Name = $name
                Executable = $exe
                CommandLine = $cmd
            }
        }

        $processInfo | ForEach-Object {
            $previewCmd = if ($_.CommandLine) {
                if ($_.CommandLine.Length -gt 120) { $_.CommandLine.Substring(0, 117) + '...' } else { $_.CommandLine }
            } else { '(command line unavailable)' }

            Write-Host ("  PID: {0}  Name: {1}" -f $_.Id, $_.Name) -ForegroundColor DarkYellow
            if ($_.Executable) {
                Write-Host ("    Executable: {0}" -f $_.Executable) -ForegroundColor DarkGray
            }
            Write-Host ("    CommandLine: {0}" -f $previewCmd) -ForegroundColor DarkGray
        }

        $failed = @()
        foreach ($proc in $processInfo) {
            if (-not $proc.Id) { continue }
            try {
                Write-Host ("Attempting to stop PID $($proc.Id) ($($proc.Name))...") -ForegroundColor Cyan
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host ("Successfully stopped PID $($proc.Id)") -ForegroundColor Green
            }
            catch {
                Write-Host ("Failed to stop PID $($proc.Id): $($_.Exception.Message)") -ForegroundColor Red
                $failed += $proc.Id
            }
        }

        if ($failed.Count -gt 0) {
            Write-Host ("Warning: Could not stop the following PIDs: {0}" -f ($failed -join ", ")) -ForegroundColor Red
            Write-Host "Continuing cleanup anyway..." -ForegroundColor Yellow
        }
        else {
            Write-Host "All project processes stopped successfully." -ForegroundColor Green
        }

        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "No running project processes found." -ForegroundColor Green
    }

    Write-Host ""

    # Python environments first, then caches (quiet mode to reduce noise)
    Remove-DirectoriesByName -Names @(".venv", "venv") -Heading "Removing virtual environments..." -Label "Virtual env"

    Remove-DirectoriesByName -Names @("__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache") -Heading "Removing Python cache directories..." -Label "Cache" -Quiet

    # Additional targeted files/directories
    $targetedCleanup = @(
        @{ Path = "node_modules"; Description = "root node_modules" },
        @{ Path = "frontend\node_modules"; Description = "frontend/node_modules" },
        @{ Path = "backend\node_modules"; Description = "backend/node_modules" },
        @{ Path = "logs"; Description = "logs directory" },
        @{ Path = "backend\logs"; Description = "backend/logs directory" },
        @{ Path = "monitor_artifacts"; Description = "monitor_artifacts directory" },
        @{ Path = "tmp_test_migrations"; Description = "tmp_test_migrations directory" },
        @{ Path = "backend\\tmp_alembic_autogen.db"; Description = "backend/tmp_alembic_autogen.db" },
        @{ Path = ".coverage"; Description = "coverage data (.coverage)" },
        @{ Path = "coverage.xml"; Description = "coverage.xml" },
        @{ Path = "backend\\.coverage"; Description = "backend/.coverage" },
        @{ Path = "backend\\coverage.xml"; Description = "backend/coverage.xml" },
        @{ Path = "backend\\htmlcov"; Description = "backend/htmlcov" },
        @{ Path = "frontend\\coverage"; Description = "frontend/coverage" },
        @{ Path = "frontend\\.vite"; Description = "frontend/.vite cache" },
        @{ Path = "frontend\\.turbo"; Description = "frontend/.turbo cache" },
        @{ Path = "frontend\\.cache"; Description = "frontend/.cache" },
        @{ Path = "frontend\\.eslintcache"; Description = "frontend/.eslintcache" },
        @{ Path = "frontend\\.parcel-cache"; Description = "frontend/.parcel-cache" },
        @{ Path = "frontend\\dist"; Description = "frontend/dist build" },
        @{ Path = "frontend_dev_error.log"; Description = "frontend_dev_error.log" },
        @{ Path = "frontend_dev_output.log"; Description = "frontend_dev_output.log" },
        @{ Path = "backend_dev_error.log"; Description = "backend_dev_error.log" },
        @{ Path = "backend_dev_output.log"; Description = "backend_dev_output.log" },
        @{ Path = "frontend_audit_after_force.json"; Description = "frontend_audit_after_force.json" },
        @{ Path = "setup.log"; Description = "setup.log" }
    )
    Cleanup-Targets -Targets $targetedCleanup -Heading "Removing build artifacts, logs, and reports..."

    # Old backups cleanup (retain two most recent by LastWriteTime)
    Write-Host "Cleaning old backup directories..." -ForegroundColor Cyan
    if (Test-Path -LiteralPath (Join-Path $script:ScriptRoot "backups")) {
        $backups = Get-ChildItem "backups" -Directory -ErrorAction SilentlyContinue | Sort-Object -Property LastWriteTime -Descending
        if ($backups.Count -gt 2) {
            $toRemove = $backups | Select-Object -Skip 2
            foreach ($backup in $toRemove) {
                    [void](Remove-SafeItem -Path $backup.FullName -Description "Old backup: $(Convert-ToRelativePath $backup.FullName)")
            }
            Write-Host "✓ Kept the two most recent backups, removed $($toRemove.Count) older backups" -ForegroundColor Green
        } else {
            Write-Host "○ Only $($backups.Count) backup folder(s) found - keeping all" -ForegroundColor Gray
        }
    } else {
        Write-Host "○ No backups directory found" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Cleanup Summary" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host ""

    if ($script:cleaned.Count -gt 0) {
        Write-Host "Successfully cleaned ($($script:cleaned.Count) items):" -ForegroundColor Green
        foreach ($item in $script:cleaned) {
            Write-Host "  ✓ $item" -ForegroundColor Green
        }
        Write-Host ""
        $totalMB = [math]::Round($script:totalSize / 1MB, 2)
        Write-Host "Total space freed: $totalMB MB" -ForegroundColor Cyan
    } else {
        Write-Host "No items were removed." -ForegroundColor Yellow
    }

    if ($script:errors.Count -gt 0) {
        Write-Host ""
        Write-Host "Errors encountered ($($script:errors.Count) items):" -ForegroundColor Red
        foreach ($err in $script:errors) {
            Write-Host "  ✗ $err" -ForegroundColor Red
        }
    }

    $resolvedMode = Resolve-SetupMode $SetupMode

    Write-Host ""
    Invoke-SetupFlow -Mode $resolvedMode

    if ($script:setupActions.Count -gt 0) {
        Write-Host "" 
        Write-Host "Post-clean setup actions:" -ForegroundColor Cyan
        foreach ($action in $script:setupActions) {
            Write-Host "  • $action" -ForegroundColor Green
        }
    }

    if ($script:setupErrors.Count -gt 0) {
        Write-Host "" 
        Write-Host "Setup warnings/errors:" -ForegroundColor Yellow
        foreach ($item in $script:setupErrors) {
            Write-Host "  • $item" -ForegroundColor Yellow
        }
    }

    if ($resolvedMode -eq 'None' -and $script:setupActions.Count -eq 0) {
        Write-Host "" 
        Write-Host "Tip: use -SetupMode Native to rebuild dependencies after cleaning." -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "SUPER CLEAN completed!" -ForegroundColor Green
    Write-Host ""
}
finally {
    Pop-Location
}
