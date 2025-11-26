# 🔐 Admin Login Setup Guide

## Quick Reference

**Need to access the Control Panel and manage users?** Follow these simple steps to create your admin account.

---

## Method 1: Auto-Bootstrap (Recommended)

### ✅ Best for: First-time setup, Docker deployments

**Steps:**

1. **Stop the application** (if running):

   ```powershell
   .\RUN.ps1 -Stop
   ```

2. **Edit the root `.env` file** in your project directory:

   ```dotenv
   VERSION=1.8.5
   
   # Add these lines:
   AUTH_ENABLED=True
   DEFAULT_ADMIN_EMAIL=admin@example.com
   DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
   DEFAULT_ADMIN_FULL_NAME=System Administrator
   ```

   > **💡 Tip:** The `.env` file is in the root directory, not in `backend/.env`

3. **Start the application**:

   ```powershell
   .\RUN.ps1
   ```

4. **Login to the application**:
   - Open browser: <http://localhost:8080>
   - Click the **Login** button (top-right corner)
   - Enter your email and password
   - Click **Sign In**

5. **⚠️ Change your password immediately**:
   - Go to **Control Panel** → **Administrator** tab
   - Find your user account
   - Click **Reset password**
   - Set a new secure password

---

## Method 2: Manual Tool (Alternative)

### ✅ Best for: Adding admins to running systems, multiple admin accounts

**For Docker:**

```powershell
# Run this command after the app is started:
docker exec -it sms-app python /app/backend/tools/create_admin.py --email admin@example.com

# You'll be prompted to enter a password
# Then login at http://localhost:8080
```

**For Native Development:**

```powershell
# Run from project root:
python backend/tools/create_admin.py --email admin@example.com --password YourPassword123!

# Then login at http://localhost:8000 (native mode uses port 8000)
```

---

## What You Can Do as Admin

Once logged in with your admin account, you can:

- ✅ **Manage Users**: Create, update, delete user accounts
- ✅ **Reset Passwords**: Reset passwords for any user
- ✅ **Control Panel Access**: View system diagnostics, logs, and health
- ✅ **System Operations**: Run backups, imports, and maintenance tasks
- ✅ **View Reports**: Access all analytics and performance data

---

## Troubleshooting

### "Access Denied" in Control Panel

**Problem:** You see an amber warning box saying "Access Denied"

**Solutions:**

1. Make sure `AUTH_ENABLED=True` in your `.env` file
2. Verify you're logged in (check for user icon in top-right)
3. Confirm your account has `admin` role (not `teacher` or `student`)
4. Restart the application after changing `.env`

### Can't Login

**Problem:** Login button doesn't work or shows errors

**Check:**

1. Is the application running? Run `.\RUN.ps1 -Status`
2. Is `AUTH_ENABLED=True` in your `.env` file?
3. Did the admin account get created? Check logs: `.\RUN.ps1 -Logs`
4. Try the alternative method (manual tool)

### Wrong Password

**Problem:** "Invalid credentials" error

**Solutions:**

1. Use the reset password feature in Control Panel (if you can login with another admin)
2. Or recreate the admin user:
   - Set `DEFAULT_ADMIN_FORCE_RESET=True` in `.env`
   - Restart application
   - This will reset the password to what's in `.env`

### Docker Environment Variables Not Working

**Problem:** Admin bootstrap doesn't create the account

**Check:**

1. The root `.env` file (not `backend/.env`)
2. Variables must be in root `.env` for Docker
3. Run `.\SUPER_CLEAN_AND_DEPLOY.ps1 -SetupMode Docker` to rebuild cleanly

---

## Security Best Practices

### ✅ DO:

- Change default passwords immediately after first login
- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Keep admin credentials secure and private
- Limit number of admin accounts
- Review user accounts regularly

### ❌ DON'T:

- Use `admin@example.com` and `ChangeMe123!` in production
- Share admin credentials with multiple people
- Leave `DEFAULT_ADMIN_PASSWORD` in `.env` after setup
- Keep `DEFAULT_ADMIN_FORCE_RESET=True` enabled permanently

---

## Need More Help?

- **Quick Start Guide**: `docs/user/QUICK_START_GUIDE.md`
- **Full Installation Guide**: `INSTALLATION_GUIDE.md`
- **Authentication Docs**: `docs/development/AUTHENTICATION.md`
- **Control Panel Guide**: Open the app and click the **?** icon in Control Panel

---

## Summary

**Fastest way to get started:**

```powershell
# 1. Stop app
.\RUN.ps1 -Stop

# 2. Edit root .env file and add:
#    AUTH_ENABLED=True
#    DEFAULT_ADMIN_EMAIL=admin@example.com
#    DEFAULT_ADMIN_PASSWORD=YourPassword123!

# 3. Start app
.\RUN.ps1

# 4. Login at http://localhost:8080
# 5. Change password in Control Panel → Administrator
```

That's it! 🎉
