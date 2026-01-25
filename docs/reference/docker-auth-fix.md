# Docker Authentication Login Fix

## Issue

After installing the latest version on a new PC, the Docker deployment shows a login screen but returns "Not found" when trying to login with administrative credentials.

## Root Cause

The `docker-compose.yml` was defaulting `AUTH_ENABLED` to `False`, causing a mismatch between:

- **Frontend**: Built with authentication UI (showing login screen)
- **Backend**: Running with authentication disabled (AUTH_ENABLED=False)

This caused the auth endpoints to not work properly, resulting in "Not found" errors.

## Solution Applied

### 1. Fixed docker-compose.yml

Changed the default value for `AUTH_ENABLED` from `False` to `True`:

```yaml
# BEFORE (incorrect)

- AUTH_ENABLED=${AUTH_ENABLED:-False}

# AFTER (correct)

- AUTH_ENABLED=${AUTH_ENABLED:-True}

```text
Also set sensible defaults for admin bootstrap:

```yaml
- DEFAULT_ADMIN_EMAIL=${DEFAULT_ADMIN_EMAIL:-admin@example.com}
- DEFAULT_ADMIN_FULL_NAME=${DEFAULT_ADMIN_FULL_NAME:-System Administrator}

```text
### 2. Deployment Steps

**For New Installations:**

1. Ensure your `.env` file has authentication settings:

   ```bash
   # .env in project root
   AUTH_ENABLED=True
   DEFAULT_ADMIN_EMAIL=admin@example.com
   DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
   DEFAULT_ADMIN_FULL_NAME=System Administrator
   ```

2. Rebuild and restart Docker:

   ```powershell
   # Stop existing containers
   .\DOCKER.ps1 -Stop

   # Rebuild with updated configuration
   .\DOCKER.ps1 -UpdateClean

   # Or fresh start
   .\DOCKER.ps1 -Start
   ```

3. Login at <http://localhost:8080> with:
   - Email: `admin@example.com`
   - Password: `YourSecurePassword123!` (or whatever you set)

**For Existing Installations:**

If you already have a running Docker container with the old configuration:

```powershell
# Rebuild containers to pick up new environment variables

.\DOCKER.ps1 -UpdateClean

```text
### 3. Verify the Fix

After restarting, check:

1. **Backend logs** for admin account creation:

   ```powershell
   docker logs sms-backend 2>&1 | Select-String "admin"
   ```

   You should see:

   ```
   Created default admin account: admin@example.com
   ```

2. **API health check**:

   ```powershell
   curl http://localhost:8080/api/v1/health
   ```

3. **Auth endpoint**:

   ```powershell
   curl http://localhost:8080/api/v1/auth/me
   ```

   Should return 401 (unauthorized) - this means auth is working!

### 4. Common Issues

**Issue: Still getting "Not found"**

- Solution: Make sure you rebuilt the containers with `.\DOCKER.ps1 -UpdateClean`
- Old containers may still be using cached environment variables

**Issue: Can't login with default credentials**

- Solution: Check if `.env` file has the correct password
- The password MUST match what's in the `.env` file
- Default: `YourSecurePassword123!`

**Issue: No admin user created**

- Solution: Check backend logs:

  ```powershell
  docker logs sms-backend | Select-String "admin|bootstrap"
  ```

- If no admin was created, check that DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD are set

**Issue: Login works but shows "Forbidden"**

- Solution: This usually means AUTH_MODE is set to 'strict' - change to 'permissive':

  ```
  AUTH_MODE=permissive
  ```

## Testing the Fix

1. **Stop any running containers:**

   ```powershell
   .\DOCKER.ps1 -Stop
   ```

2. **Clean rebuild:**

   ```powershell
   .\DOCKER.ps1 -UpdateClean
   ```

3. **Check logs:**

   ```powershell
   docker logs sms-backend
   ```

   Look for:
   - `AUTH_ENABLED=True` in environment dump
   - `Created default admin account: admin@example.com`

4. **Access the application:**
   - Navigate to: <http://localhost:8080>
   - Login with: `admin@example.com` / `YourSecurePassword123!`
   - You should see the main dashboard

## Security Note

⚠️ **IMPORTANT**: After your first successful login, immediately:

1. Go to Control Panel → Maintenance → User Management
2. Change the default admin password
3. Consider creating additional admin users
4. Update your `.env` file with the new password for future deployments

## For Docker Compose Users

If you're using docker-compose directly (not via DOCKER.ps1):

```bash
# Rebuild with new environment

docker-compose down
docker-compose build --no-cache backend
docker-compose up -d

# Check logs

docker-compose logs backend | grep -i admin

```text
## For QNAP/NAS Deployments

If deploying to QNAP or other NAS:

1. Edit `.env` on your NAS
2. Use the QNAP-specific compose file:

   ```bash
   docker-compose -f docker-compose.qnap.yml down
   docker-compose -f docker-compose.qnap.yml build --no-cache
   docker-compose -f docker-compose.qnap.yml up -d
   ```

## Verification Checklist

- [ ] `.env` file has `AUTH_ENABLED=True`
- [ ] `.env` file has `DEFAULT_ADMIN_EMAIL` set
- [ ] `.env` file has `DEFAULT_ADMIN_PASSWORD` set
- [ ] Rebuilt Docker containers with `.\DOCKER.ps1 -UpdateClean`
- [ ] Backend logs show admin account creation
- [ ] Can access login page at <http://localhost:8080>
- [ ] Can successfully login with admin credentials
- [ ] Dashboard loads after login
- [ ] Changed default password after first login

## Related Files

- `docker-compose.yml` - Main Docker Compose configuration
- `.env` - Environment variables (authentication settings)
- `backend/.env` - Backend-specific environment (should mirror root .env)
- `backend/config.py` - Settings validation and defaults
- `backend/scripts/admin/bootstrap.py` - Admin account creation logic (primary)
- `backend/admin_bootstrap.py` - Deprecated shim maintained for backward compatibility

## Additional Help

If you still have issues:

1. Check the full logs: `docker logs sms-backend > backend.log`
2. Look for any ERROR or WARNING messages
3. Verify all environment variables are set: `docker exec sms-backend env | grep AUTH`
4. Consult `docs/AUTHENTICATION.md` for more details
