# Frontend Port Binding Fix - Summary

**Date**: January 14, 2026
**Problem**: Vite dev server binding to IPv6 [::1]:5173, causing E2E tests to fail with "net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173"
**Root Cause**: Windows resolves `localhost` to IPv6 first when only IPv6 interface is available

## Changes Made

### 1. NATIVE.ps1 (Frontend Startup)
**Location**: Lines 625-645
**Changes**:
- PowerShell method: `npm run dev -- --host 0.0.0.0 --port 5173`
- Node/npm fallback: `npm run dev -- --host 0.0.0.0 --port 5173`

**Why `0.0.0.0`**:
- Binds to ALL interfaces (both IPv4 and IPv6)
- Windows can then reach via `localhost` which works
- Overrides vite.config.ts `host: 'localhost'` setting

### 2. vite.config.ts (Vite Config)
**Location**: Lines 111-112
**Current**:
```typescript
host: 'localhost',
port: 5173,
strictPort: true,
```

**Explanation**:
- This is a fallback only - CLI args from NATIVE.ps1 override this
- Keeping as 'localhost' ensures dev experience is good
- CLI `--host 0.0.0.0` takes precedence

### 3. RUN_E2E_TESTS.ps1 (E2E Test Script)
**Changes**:
- Now sets: `$env:PLAYWRIGHT_BASE_URL = "http://localhost:$frontendPort"`
- HTTP check verifies: `http://localhost:$frontendPort`

**Why `localhost` instead of `127.0.0.1`**:
- Works with `0.0.0.0` binding
- More standard for local testing
- Playwright baseURL matches

### 4. playwright.config.ts (Playwright Config)
**Changes**:
- baseURL: `'http://localhost:5173'`
- webServer.url: `'http://localhost:5173'`

## Testing the Fix

### Quick Test
```powershell
# Stop any running Vite (close terminal windows)
# Then run:
.\RUN_E2E_TESTS.ps1
```

### What Should Happen
1. Script starts backend on 8000
2. Script starts frontend with `npm run dev -- --host 0.0.0.0 --port 5173`
3. Vite binds to [0.0.0.0]:5173 (all interfaces)
4. HTTP check: `http://localhost:5173` → SUCCESS
5. Playwright tests run and pass

### Verification Steps
```powershell
# After NATIVE.ps1 starts and frontend is running, in new terminal:
netstat -ano | findstr :5173
```

Expected output (one of):
```
TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       <PID>
TCP    [::]:5173              [::]:0                 LISTENING       <PID>
TCP    127.0.0.1:5173        0.0.0.0:0              LISTENING       <PID>
```

Any of these means Vite is listening on 5173 for localhost/127.0.0.1 access.

## Why This Works

1. **0.0.0.0 binding** = Listen on all interfaces
2. **localhost resolution** = Windows resolves to 127.0.0.1 or ::1
3. **HTTP check** = Verifies Vite is actually serving content
4. **Playwright baseURL** = Points to localhost:5173
5. **String matching** = localhost everywhere instead of mixing IPv4/IPv6

## Files Modified

- ✅ NATIVE.ps1 (npm startup args)
- ✅ vite.config.ts (host/port config)
- ✅ RUN_E2E_TESTS.ps1 (HTTP check + baseURL)
- ✅ playwright.config.ts (baseURL + webServer URL)

## Next Steps

1. Close any open Vite terminal windows
2. Run `.\RUN_E2E_TESTS.ps1`
3. Verify tests pass
4. If HTTP check still times out, check `netstat -ano | findstr :5173` to see actual binding

## Critical: Service Restart Required!

The fixes only take effect when Vite is restarted with the new configuration. Any old Vite processes must be killed first.
