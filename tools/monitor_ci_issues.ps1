# Monitor GitHub issues labeled `ci-failure` for repository bs1gr/AUT_MIEEK_SMS
# Usage: set env GITHUB_TOKEN if the `gh` CLI isn't available or the repo is private.

param(
    [string]$Owner = 'bs1gr',
    [string]$Repo = 'AUT_MIEEK_SMS',
    [int]$PollSeconds = 600,
    [string]$StateFile = "$PSScriptRoot/.ci_monitor_seen.json",
    [string]$LogFile = "$PSScriptRoot/ci_monitor.log"
)

function Write-Log {
    param([string]$Message)
    $t = (Get-Date).ToString('o')
    "$t`t$Message" | Out-File -FilePath $LogFile -Encoding utf8 -Append
}

function Get-Issues-With-GH {
    try {
        $cmd = @('issue','list','--label','ci-failure','--repo',"$Owner/$Repo",'--state','open','--limit','100','--json','number,title,url,createdAt')
        $out = gh @cmd 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "gh exit code $($LASTEXITCODE): $out"
        }
        if (-not $out) { return @() }
        return $out | ConvertFrom-Json
    } catch {
        throw $_
    }
}

function Get-Issues-With-API {
    if (-not $env:GITHUB_TOKEN) { throw 'GITHUB_TOKEN not set; cannot use API fallback.' }
    $url = "https://api.github.com/repos/$Owner/$Repo/issues?labels=ci-failure&state=open&per_page=100"
    $hdr = @{ Authorization = "token $env:GITHUB_TOKEN"; 'User-Agent' = 'ci-monitor' }
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $hdr -UseBasicParsing
        if (-not $resp) { return @() }
        return $resp | ForEach-Object {
            [PSCustomObject]@{
                number = $_.number
                title  = $_.title
                url    = $_.html_url
                createdAt = $_.created_at
            }
        }
    } catch {
        throw $_
    }
}

# Ensure tools dir exists
if (-not (Test-Path -Path $PSScriptRoot)) { New-Item -ItemType Directory -Path $PSScriptRoot | Out-Null }

# Initialize state file
$seen = @{}
if (Test-Path -Path $StateFile) {
    try { $seenArr = Get-Content -Path $StateFile -Raw | ConvertFrom-Json; foreach ($n in $seenArr) { $seen["$($n)"] = $true } } catch { $seen = @{} }
}

Write-Log "Starting ci-failure monitor for $Owner/$Repo (poll every $PollSeconds seconds)."
Write-Host "Starting ci-failure monitor for $Owner/$Repo (poll every $PollSeconds seconds). Log: $LogFile"

while ($true) {
    try {
        $issues = @()
        # Prefer gh CLI when available
        if (Get-Command gh -ErrorAction SilentlyContinue) {
            try {
                $issues = Get-Issues-With-GH
            } catch {
                Write-Log "gh CLI present but failed: $_"
                $issues = @()
            }
        }
        if (-not $issues -or $issues.Count -eq 0) {
            # Try API fallback
            try {
                $issues = Get-Issues-With-API
            } catch {
                Write-Log "API fallback failed or not available: $_"
            }
        }

        if ($issues -and $issues.Count -gt 0) {
            foreach ($issue in $issues) {
                $num = $issue.number.ToString()
                if (-not $seen.ContainsKey($num)) {
                    $msg = "New ci-failure issue: #$num - $($issue.title) - $($issue.url)"
                    Write-Log $msg
                    Write-Host $msg
                    # Optionally: fetch run details from the issue body or comments later
                    $seen[$num] = $true
                }
            }
            # persist seen list
            $seenKeys = $seen.Keys | Sort-Object {[int]$_}
            $seenKeys | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
        } else {
            Write-Log "No ci-failure issues found."
            #Console output suppressed to reduce noise
        }
    } catch {
        Write-Log "Monitor loop error: $_"
        Write-Host "Monitor loop error: $_"
    }
    Start-Sleep -Seconds $PollSeconds
}
