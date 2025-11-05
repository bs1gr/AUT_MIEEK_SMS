# Terminal Command Best Practices

## Issue Summary

During extended development sessions with many terminal operations, command fragmentation can occur where only partial commands are executed (e.g., single characters instead of full commands).

## Root Causes

1. **Long sessions** with 50+ terminal commands
2. **Multiple concurrent terminals** (10+ open at once)
3. **Complex commands** with pipes, special characters, and multi-line syntax
4. **Terminal buffer state** degradation over time

## Prevention Guidelines

### 1. Command Simplicity

**DO:**

```powershell
# Simple, atomic commands
Get-Process -Name python
Test-Path backend/venv
docker compose ps
```text

**AVOID:**

```powershell
# Complex commands with multiple operations
$backend = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue; $frontend = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue; Write-Host "Backend (8000): $backend"; Write-Host "Frontend (5173): $frontend"
```

### 2. Session Management

**Best Practices:**

- Limit active terminals to **5 or fewer** concurrent sessions
- Close finished terminal sessions promptly
- Use fresh terminals for critical operations
- Restart terminal sessions after **30-40 commands**

### 3. Error Detection & Recovery

**When command fragmentation is detected:**

```powershell
# Symptoms: Single-character commands, truncated output
# Recovery steps:
1. Stop sending commands to affected terminal
2. Create a fresh terminal for subsequent commands
3. Verify command execution with simple test
4. Continue with clean session
```

**Detection pattern:**

```text
Command sent: Get-Process -Name python
Output: "o: The term 'o' is not recognized..."
→ TERMINAL CORRUPTED - Switch to new session
```

### 4. Command Structure

**Prefer:**

- Single-line commands
- Simple variable assignments
- Direct command execution
- Separate commands with ; sparingly

**Avoid:**

- Multi-line complex pipelines in single command
- Excessive variable interpolation
- Deep nesting of subexpressions
- Commands longer than 200 characters

### 5. Validation Commands

**Use these simple commands to validate terminal health:**

```powershell
# Test 1: Simple echo
Write-Host "TEST"

# Test 2: Simple process check
Get-Process | Select-Object -First 1

# Test 3: Current location
Get-Location

# If any fail → Terminal is corrupted → Use new terminal
```

### 6. Long-Running Sessions

**For extended development work:**

1. **Every 20-30 commands**: Run a validation test
2. **After complex operations**: Verify terminal responds correctly
3. **Before critical commands**: Test with simple command first
4. **Use background flag** judiciously - prefer blocking for critical operations

### 7. Script Execution

**Instead of complex terminal commands:**

```powershell
# DON'T: Complex inline command
Get-Process | Where-Object {$_.ProcessName -match "python|node"} | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; & .\scripts\legacy\RUN.ps1

# DO: Break into separate commands
Get-Process -Name python,node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
& .\scripts\legacy\RUN.ps1
```

**Or use a wrapper script:**

```powershell
# cleanup-and-run.ps1
Get-Process -Name python,node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
& .\scripts\legacy\RUN.ps1

# Then simply:
.\cleanup-and-run.ps1
```

## Recovery Checklist

When terminal issues occur:

- [ ] Stop sending commands to affected terminal
- [ ] Note the last successful command
- [ ] Create new terminal session
- [ ] Verify new terminal with simple command (e.g., `Get-Location`)
- [ ] Continue work in clean session
- [ ] Document any patterns that triggered the issue

## Monitoring

**Red flags indicating terminal degradation:**

- Commands taking longer to execute than normal
- Partial output or truncated responses
- Single-character execution errors
- Prompt not appearing after command completion
- Background processes not registering properly

**Action**: Switch to fresh terminal immediately when detected.

## Related Issues

- Token limit approaching (>90k): Consider resetting context
- Many failed command attempts: Fresh terminal recommended
- Complex operation sequences: Break into smaller scripts

---

*Last Updated: October 29, 2025*
*Context: Terminal fragmentation issue during native startup debugging session*
