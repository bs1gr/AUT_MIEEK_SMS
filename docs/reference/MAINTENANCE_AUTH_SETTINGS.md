# Authentication Settings Management - Control Panel

**Feature:** Maintenance Suite - AUTH_MODE Configuration  
**Added:** $11.9.7.4  
**Access:** `/control` → Maintenance Tab

## Overview

Admins can now manage authentication and authorization policies directly from the Control Panel without manually editing `.env` files or restarting the application.

## New API Endpoints

### 1. Get Current Settings
**GET** `/control/api/maintenance/auth-settings`

Returns current authentication configuration:
```json
{
  "auth_enabled": true,
  "auth_mode": "permissive",
  "auth_login_max_attempts": 5,
  "auth_login_lockout_seconds": 300,
  "auth_login_tracking_window_seconds": 300,
  "source": "backend/.env",
  "effective_policy": "🔐 Authentication required, but all authenticated users have full access (recommended)"
}
```

### 2. Update Settings
**POST** `/control/api/maintenance/auth-settings`

Update one or more authentication settings:
```json
{
  "auth_enabled": true,
  "auth_mode": "permissive",
  "auth_login_max_attempts": 10,
  "auth_login_lockout_seconds": 600
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication settings updated in backend/.env. Restart required to take effect.",
  "details": {
    "file": "D:/SMS/student-management-system/backend/.env",
    "updated_values": {
      "AUTH_ENABLED": true,
      "AUTH_MODE": "permissive"
    },
    "effective_policy": "🔐 Authentication required, but all authenticated users have full access (recommended)",
    "requires_restart": true
  },
  "timestamp": "2025-11-21T21:30:00"
}
```

### 3. Get Policy Guide
**GET** `/control/api/maintenance/auth-policy-guide`

Returns comprehensive documentation on all AUTH_MODE options and settings.

## Authorization Modes

### 🔓 Disabled
**Use Case:** Development, testing, or fully public systems  
**Behavior:** All endpoints accessible without login  
**Security:** None  

**When to use:**
- Local development
- Running automated tests
- Public demo environments

### 🔐 Permissive (Recommended)
**Use Case:** Production systems where all users are trusted  
**Behavior:** Users must login, but can access all endpoints regardless of role  
**Security:** Medium  

**When to use:**
- Production environments (default recommendation)
- Systems where all registered users should have full access
- When you want authentication but not role restrictions
- **Solves the "teacher can't enroll students" issue**

### 🔒 Strict
**Use Case:** High-security environments with distinct roles  
**Behavior:** Endpoints check user roles, deny access if role doesn't match  
**Security:** High  

**When to use:**
- Strict role separation needed (admin vs teacher vs student)
- Compliance requirements for access control
- High-security institutional environments

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `AUTH_ENABLED` | boolean | `false` | Master authentication switch. If false, overrides AUTH_MODE |
| `AUTH_MODE` | string | `disabled` | Authorization enforcement: `disabled`, `permissive`, `strict` |
| `AUTH_LOGIN_MAX_ATTEMPTS` | integer | `5` | Max failed login attempts before lockout (1-100) |
| `AUTH_LOGIN_LOCKOUT_SECONDS` | integer | `300` | Lockout duration in seconds (0-3600, 300 = 5 minutes) |
| `AUTH_LOGIN_TRACKING_WINDOW_SECONDS` | integer | `300` | Time window for tracking failed attempts |

## Usage Examples

### Example 1: Enable Authentication (Production Setup)
```bash
POST /control/api/maintenance/auth-settings
{
  "auth_enabled": true,
  "auth_mode": "permissive"
}
```

**Result:** Users must login, but all authenticated users have full access.

### Example 2: Switch to Strict Mode
```bash
POST /control/api/maintenance/auth-settings
{
  "auth_mode": "strict"
}
```

**Result:** Full RBAC enforcement. Teachers can't access admin endpoints.

### Example 3: Adjust Lockout Policy
```bash
POST /control/api/maintenance/auth-settings
{
  "auth_login_max_attempts": 10,
  "auth_login_lockout_seconds": 600
}
```

**Result:** Allow 10 attempts before 10-minute lockout (more lenient for users who forget passwords).

### Example 4: Disable Authentication (Testing)
```bash
POST /control/api/maintenance/auth-settings
{
  "auth_enabled": false
}
```

**Result:** All endpoints public, no login required.

## Configuration Presets

### Development Environment
```json
{
  "auth_enabled": false,
  "auth_mode": "disabled"
}
```
No authentication for quick development.

### Production (Recommended)
```json
{
  "auth_enabled": true,
  "auth_mode": "permissive"
}
```
Users must login but no role restrictions.

### High-Security Production
```json
{
  "auth_enabled": true,
  "auth_mode": "strict"
}
```
Full RBAC with role enforcement.

## Important Notes

### ⚠️ Restart Required

Changes to authentication settings require an application restart:

**Docker:**

```powershell
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Start
```

**Native:**

```powershell
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Start
```

### Configuration Precedence

1. Environment variables (highest priority)
2. `.env` file in backend/ directory
3. `.env` file in root directory
4. Default values (lowest priority)

### File Location

Settings are written to:

- `backend/.env` (if it exists)
- `.env` (root, if backend/.env doesn't exist)

If neither exists, the endpoint will create one from `.env.example`.

## Integration with Frontend

The Maintenance Tab in the Control Panel (`/control`) should be updated to include:

1. **Settings Display Panel**
   - Show current AUTH_ENABLED and AUTH_MODE
   - Display effective policy with icon (🔓 🔐 🔒)
   - Show source (.env file or environment)

2. **Quick Policy Switcher**
   - Radio buttons for: Disabled / Permissive / Strict
   - "Apply" button to update settings
   - Warning: "Restart required to take effect"

3. **Advanced Settings Section**
   - Input fields for login attempt limits
   - Lockout duration slider (1-60 minutes)
   - "Save" button

4. **Policy Guide Modal**
   - Link to open policy documentation
   - Show comparison table
   - Usage recommendations

## Testing

Run maintenance endpoint tests:
```bash
cd backend
python -m pytest tests/test_control_maintenance.py -v
```

All 6 tests should pass:
- ✅ Get current auth settings
- ✅ Get policy guide
- ✅ Update auth settings
- ✅ Update multiple settings
- ✅ Validation (invalid values rejected)
- ✅ OpenAPI registration

## Security Considerations

1. **Control Panel Access:** These endpoints are in `/control/api/` namespace, which should be restricted to admin users only
2. **File Permissions:** Ensure `.env` files have proper permissions (not world-readable)
3. **Backup Before Changes:** Always backup `.env` before making changes
4. **Audit Trail:** Consider logging all auth policy changes

## Troubleshooting

### Settings not taking effect
**Solution:** Restart the application. Settings are loaded at startup.

### "No .env file found" error
**Solution:** The endpoint will try to create one from `.env.example`. If that fails, manually create `backend/.env` from `backend/.env.example`.

### Changes applied to wrong .env file
**Check:** Verify which .env file the endpoint reports updating in the response:
```json
{
  "details": {
    "file": "D:/SMS/student-management-system/backend/.env"
  }
}
```

### Auth policy not changing behavior
1. Verify `AUTH_ENABLED=true` (must be true for AUTH_MODE to work)
2. Check for environment variable overrides
3. Restart application
4. Check logs for authentication configuration at startup

## API Client Examples

### cURL
```bash
# Get current settings
curl http://localhost:8080/control/api/maintenance/auth-settings

# Update to permissive mode
curl -X POST http://localhost:8080/control/api/maintenance/auth-settings \
  -H "Content-Type: application/json" \
  -d '{"auth_enabled": true, "auth_mode": "permissive"}'
```

### Python
```python
import requests

# Get settings
resp = requests.get("http://localhost:8080/control/api/maintenance/auth-settings")
settings = resp.json()
print(f"Current mode: {settings['auth_mode']}")

# Update settings
payload = {"auth_enabled": True, "auth_mode": "permissive"}
resp = requests.post(
    "http://localhost:8080/control/api/maintenance/auth-settings",
    json=payload
)
result = resp.json()
print(result["message"])
```

### JavaScript (Frontend)
```javascript
// Get current settings
const response = await fetch('/control/api/maintenance/auth-settings');
const settings = await response.json();
console.log('Current policy:', settings.effective_policy);

// Update settings
const updateResponse = await fetch('/control/api/maintenance/auth-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth_enabled: true,
    auth_mode: 'permissive'
  })
});
const result = await updateResponse.json();
alert(result.message);
```

## Related Documentation

- [../AUTH_FIX_$11.9.7.4_IMPLEMENTED.md](../AUTH_FIX_$11.9.7.4_IMPLEMENTED.md) - Implementation details
- [../AUTH_ISSUES_FIX_$11.9.7.4.md](../AUTH_ISSUES_FIX_$11.9.7.4.md) - Problem analysis and fixes
- [AUTHENTICATION.md](AUTHENTICATION.md) - General authentication guide (if available)

## Version History

- **$11.9.7.4** - Initial implementation of maintenance suite auth settings management
- **$11.9.7.4** - Added AUTH_MODE hybrid authorization system
- **$11.9.7.2** - Introduced auth issues (binary AUTH_ENABLED behavior)

