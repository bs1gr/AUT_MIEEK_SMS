# Rate Limiting Control Guide

## Overview

The Student Management System includes a flexible rate limiting system that prevents API overload while protecting against abuse. Rate limits can be adjusted dynamically by administrators without restarting the application.

## Default Rate Limits

| Limit Type | Default | Requests/Min | Use Case |
|------------|---------|--------------|----------|
| **READ** | 1,000/min | ~16.7/sec | GET requests, queries, data retrieval |
| **WRITE** | 500/min | ~8.3/sec | POST/PUT requests, data updates |
| **HEAVY** | 200/min | ~3.3/sec | Report generation, exports, expensive operations |
| **AUTH** | 120/min | ~2/sec | Login attempts, token refresh |
| **TEACHER_IMPORT** | 5,000/min | ~83/sec | Bulk imports, student/grade uploads |

## Why These Limits?

### Educational Context

- Designed for classroom environments with 30-100+ concurrent users
- Teachers need fast bulk operations (imports, exports)
- Students need responsive data access
- Balance: Prevent DoS attacks without frustrating legitimate users

### Fixed Issues

- **Login 400 errors**: Increased AUTH from 60→120/min (was blocking legitimate attempts)
- **Import slowdowns**: TEACHER_IMPORT at 5,000/min allows continuous bulk operations
- **Dashboard lag**: READ/WRITE limits prevent cascade failures from simple mistakes

## Admin Control Panel

### Accessing Rate Limit Settings

1. **Navigate to Control Panel** (admin-only)
2. **Click "Rate Limits" tab** (Zap icon ⚡)
3. **Adjust sliders** for each limit type
4. **Click Save** to apply immediately

### Control Panel Features

```text
Rate Limit Configuration
├── Read Requests (GET queries)
│   └── Slider: 0-10,000/min
├── Write Requests (POST/PUT updates)
│   └── Slider: 0-5,000/min
├── Heavy Operations (Reports)
│   └── Slider: 0-1,000/min
├── Authentication (Logins)
│   └── Slider: 0-500/min
└── Bulk Imports (Teachers)
    └── Slider: 0-20,000/min

```text
### Visual Indicators

- **Default value** shown for each limit
- **% change** from default highlighted in green/red
- **Save button** disabled until changes made
- **Reset to Defaults** button available at all times

## Configuration Methods

### 1. **Admin Control Panel** (Recommended)

- User-friendly interface
- Changes apply immediately
- Persisted to disk
- Full audit trail via request logging

```text
POST /control/api/rate-limits/update
{
  "limit_type": "auth",
  "value": 240
}

```text
### 2. **Environment Variables** (Deployment)

- Set at startup time
- Override defaults and saved config
- Useful for container/Kubernetes deployments

```bash
RATE_LIMIT_READ_PER_MINUTE=2000
RATE_LIMIT_WRITE_PER_MINUTE=1000
RATE_LIMIT_AUTH_PER_MINUTE=240
RATE_LIMIT_HEAVY_PER_MINUTE=400
RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE=10000

```text
### 3. **Docker/Kubernetes**

```yaml
environment:
  - RATE_LIMIT_AUTH_PER_MINUTE=240
  - RATE_LIMIT_WRITE_PER_MINUTE=1000

```text
## Rate Limit Behavior

### What Happens at Limit?

When a user exceeds a rate limit:

1. **HTTP 429** response returned
2. **Retry-After** header set (e.g., 30 seconds)
3. **Error message**: "Too Many Requests. Please try again later."
4. Request is **not** processed

### Example: Login Attempts

```text
User 1: Login (1st attempt) → ✅ OK
User 1: Login (2nd attempt) → ✅ OK
User 1: Login (3rd attempt) → ✅ OK
User 2: Login (1st attempt) → ✅ OK
User 2: Login (2nd attempt) → ✅ OK
...after 120 in 60 seconds...
User N: Login → ❌ 429 Too Many Requests

```text
**Wait 60+ seconds before next login attempt.**

### Per-User vs Global

- **Current**: Global limits (shared across all users)
- **Per-user limits**: Not yet implemented (future enhancement)

## Troubleshooting

### "Too Many Requests" During Normal Use

**Symptoms:**
- 429 errors on routine operations
- Teachers complaining about slow imports
- Dashboard queries failing

**Solutions:**
1. **Check current limits**: Control Panel → Rate Limits tab
2. **Increase limit**: Adjust slider and save
3. **Typical increases**:
   - Struggling with imports? Increase TEACHER_IMPORT to 10,000/min
   - Slow dashboard? Increase READ to 2,000/min
   - Write operations timing out? Increase WRITE to 1,000/min

### "Rate Limit Not Applying"

**Check:**
1. Environment variables not overriding? Remove them
2. Config file corrupted? Reset to defaults via Control Panel
3. Application caching? Restart backend: `DOCKER.ps1 -Restart`

**Reset Configuration:**

```powershell
# Via Control Panel

# Click "Reset Defaults" button

# Or via API

POST /control/api/rate-limits/reset

```text
### Login Still Failing with 400

**This is NOT a rate limit error** (would be 429)

**Check:**
1. Invalid email format
2. Password contains spaces (not allowed)
3. User account doesn't exist
4. Account is disabled

**Solutions:**
- Verify email/password validity
- Check user exists: Control Panel → Maintenance → Users
- Ensure user is active (not disabled)

## API Endpoints (Admin)

### Get Current Configuration

```http
GET /control/api/rate-limits

```text
**Response:**

```json
{
  "current": {
    "read": 1000,
    "write": 500,
    "heavy": 200,
    "auth": 120,
    "teacher_import": 5000
  },
  "defaults": {
    "read": 1000,
    "write": 500,
    "heavy": 200,
    "auth": 120,
    "teacher_import": 5000
  },
  "timestamp": "2025-12-30T10:30:00Z"
}

```text
### Update Single Limit

```http
POST /control/api/rate-limits/update
Content-Type: application/json

{
  "limit_type": "auth",
  "value": 240
}

```text
### Bulk Update Multiple Limits

```http
POST /control/api/rate-limits/bulk-update
Content-Type: application/json

{
  "limits": {
    "read": 2000,
    "write": 1000,
    "auth": 240
  }
}

```text
### Reset All to Defaults

```http
POST /control/api/rate-limits/reset

```text
## Best Practices

### For Teachers

- 💡 **Imports slow?** Ask admin to increase TEACHER_IMPORT limit
- 💡 **Dashboard lagging?** Ask admin to check READ limit

### For Administrators

- 🔍 **Monitor logs** for 429 errors to identify bottlenecks
- 📊 **Peak hours**: Consider higher limits during registration/grading periods
- 🔄 **Regular review**: Check admin logs for limit adjustments made
- 🛡️ **Security**: Keep AUTH limit moderate (120-240) to prevent brute force

### For Developers

- 🧪 **Testing**: Disable limits with `DISABLE_STARTUP_TASKS=1` env var
- 📝 **Endpoints**: Always apply appropriate limit decorator:

  ```python
  @router.post("/items/")
  @limiter.limit(RATE_LIMIT_WRITE)
  async def create_item(...):
      pass
  ```
- 🔧 **Custom limits**: Create new limit types as needed

## Performance Impact

- **Memory**: Rate limit storage ~1KB (persistent config)
- **CPU**: Negligible (<1% overhead per request)
- **Disk I/O**: One write per config change (not per request)

## Future Enhancements

- [ ] Per-user rate limits (advanced auth)
- [ ] Time-based schedules (peak hours, maintenance windows)
- [ ] Whitelist/blacklist IPs
- [ ] Endpoint-specific limits
- [ ] Real-time analytics dashboard

## Related Documentation

- [CONTROL_API.md](../backend/CONTROL_API.md) - Full API reference
- [Architecture](./development/ARCHITECTURE.md) - System design
- [Security Guide](./user/SECURITY.md) - Security best practices

