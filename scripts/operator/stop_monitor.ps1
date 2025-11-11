```powershell
# OPERATOR-ONLY: DESTRUCTIVE. This helper stops processes by PID using Stop-Process. Run only on operator-managed hosts.
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'monitor_ci_issues.ps1' }
if ($procs) {
    foreach ($p in $procs) {
        Write-Output "Stopping PID $($p.ProcessId)"
        try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { Write-Output "Failed to stop PID $($p.ProcessId): $_" }
    }
} else {
    Write-Output 'No monitor processes found.'
}

``` 
