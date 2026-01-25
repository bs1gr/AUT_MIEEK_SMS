# Rate Limiting Quick Reference

## Quick Start (Admin)

1. **Open Control Panel** → **Rate Limits** tab
2. **Adjust sliders** as needed
3. **Click Save** → Changes apply instantly ⚡

## Typical Adjustments

### Issue: "Too Many Requests" on Imports

```text
Current: TEACHER_IMPORT = 5,000/min
Solution: Increase to 10,000/min
Impact: Teachers can upload 10x more records per minute

```text
### Issue: Dashboard is Slow

```text
Current: READ = 1,000/min
Solution: Increase to 2,000/min
Impact: Queries ~2x faster, covers 100+ concurrent users

```text
### Issue: Login Failures

```text
Current: AUTH = 120/min
Solution: Check it's 120+ (not lower)
Note: If still failing, check error—might not be rate limit (would be 429)

```text
## Default Configuration (Per Minute)

```text
├─ READ:           1,000  (GET requests, queries)
├─ WRITE:            500  (POST/PUT updates)
├─ HEAVY:            200  (Reports, exports)
├─ AUTH:             120  (Login attempts) ← Fixed login 400 errors
└─ TEACHER_IMPORT: 5,000  (Bulk uploads)

```text
## Environment Variables (Deployment)

Override defaults at startup:

```bash
# Docker

docker run -e RATE_LIMIT_AUTH_PER_MINUTE=240 sms-app

# Docker Compose

environment:
  RATE_LIMIT_WRITE_PER_MINUTE: 1000
  RATE_LIMIT_AUTH_PER_MINUTE: 240

# PowerShell

$env:RATE_LIMIT_TEACHER_IMPORT_PER_MINUTE="10000"

```text
## REST API (Admin Only)

### Get Limits

```bash
curl http://localhost:8000/control/api/rate-limits

```text
### Update One Limit

```bash
curl -X POST http://localhost:8000/control/api/rate-limits/update \
  -H "Content-Type: application/json" \
  -d '{"limit_type":"auth","value":240}'

```text
### Update Multiple

```bash
curl -X POST http://localhost:8000/control/api/rate-limits/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "limits": {
      "read": 2000,
      "write": 1000,
      "auth": 240
    }
  }'

```text
### Reset All to Defaults

```bash
curl -X POST http://localhost:8000/control/api/rate-limits/reset

```text
## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| **429** | Rate limit exceeded | Wait 60+ seconds, retry |
| **400** | Invalid email/password | Check credentials (not rate limit) |
| **403** | Not authorized | Check user role (needs admin) |
| **500** | Server error | Check logs |

## Need Help?

- **Can't access Control Panel?** You need admin role
- **Changes not saving?** Check browser console for errors
- **Still getting 429?** Wait 60+ seconds, limits reset per minute
- **Limits reverted?** Application restarted—use env vars for permanent override

---

**Last Updated:** 2025-12-30
**Version:** 1.14.0
**Related:** [Full Rate Limiting Guide](RATE_LIMITING_GUIDE.md)
