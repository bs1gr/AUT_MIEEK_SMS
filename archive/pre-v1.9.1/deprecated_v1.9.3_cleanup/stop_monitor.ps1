$# OPERATOR-ONLY: DESTRUCTIVE. This helper stops processes by PID using Stop-Process. Run only on operator-managed hosts.
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'monitor_ci_issues.ps1' }
if ($procs) {
        foreach ($p in $procs) {
                Write-Output "Stopping PID $($p.ProcessId)"
                try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { Write-Output "Failed to stop PID $($p.ProcessId): $_" }
        }
} else {
        Write-Output 'No monitor processes found.'
}

<#
    DEPRECATED: stop_monitor helper moved to `scripts/operator/stop_monitor.ps1`.
    The canonical operator helper now lives under scripts/operator/.

    To run the operator helper:

        .\scripts\operator\stop_monitor.ps1

    This tools-level copy prints a guidance message and exits.
#>

Write-Host "This helper has moved to scripts/operator/stop_monitor.ps1."
Write-Host "Run: .\scripts\operator\stop_monitor.ps1"
```powershell
# DEPRECATED: stop_monitor helper moved to `scripts/operator/stop_monitor.ps1`.
# The canonical operator helper now lives under scripts/operator/.

# To run the operator helper:
#   .\scripts\operator\stop_monitor.ps1

Write-Host "This helper has moved to scripts/operator/stop_monitor.ps1."
Write-Host "Run: .\scripts\operator\stop_monitor.ps1"
exit 0
```
