# Native Development Mode - Quick Guide

**Status:** ✅ Ready to use  
**Default:** SQLite (fast development)  
**Alternative:** QNAP PostgreSQL (integration testing)

---

## 🚀 Start Development (SQLite - Default)

```powershell
.\NATIVE_TOGGLE.ps1 toggle
```

✅ **Instant startup** (< 5 seconds)  
✅ **Hot-reload enabled**  
✅ **HMR enabled**  
✅ Access: http://localhost:5173

---

## 🔧 Switch to QNAP PostgreSQL (Testing)

### Step 1: Stop services
```powershell
.\NATIVE.ps1 -Stop
```

### Step 2: Edit backend/.env
Change this line:
```env
DATABASE_ENGINE=sqlite
```
To:
```env
DATABASE_ENGINE=postgresql
```

### Step 3: Restart
```powershell
.\NATIVE_TOGGLE.ps1 toggle
```

⏳ **First startup takes 15-20 seconds** (database migrations)  
✅ **Statement timeout: 60 seconds** (safe migration protection)  
✅ Access: http://localhost:5173

---

## 🔙 Switch Back to SQLite (Development)

### Step 1: Stop services
```powershell
.\NATIVE.ps1 -Stop
```

### Step 2: Edit backend/.env
Change this line:
```env
DATABASE_ENGINE=postgresql
```
To:
```env
DATABASE_ENGINE=sqlite
```

### Step 3: Restart
```powershell
.\NATIVE_TOGGLE.ps1 toggle
```

✅ **Instant startup** again  
✅ Access: http://localhost:5173

---

## 📊 Database Comparison

| Feature | SQLite | PostgreSQL (QNAP) |
|---------|--------|------------------|
| Startup Time | < 5s | 15-20s (first) |
| Network Latency | None | ~100ms/query |
| Schema Support | Full (same as production) | Full |
| Perfect For | Daily development | Integration testing |
| Hot-reload | ✅ Yes | ✅ Yes |
| Query Timeout | N/A | 60 seconds |

---

## 📍 Access Points

```
Web App:  http://localhost:5173
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

## 💡 Pro Tips

1. **Use SQLite by default** - Fastest iteration
2. **Switch to QNAP weekly** - Test production-like scenario
3. **Check logs** - `backend/logs/app.log`
4. **Edit code** - Backend hot-reloads, frontend HMR works
5. **Stop anytime** - `.\NATIVE.ps1 -Stop`

---

## 🔍 Troubleshooting

### Backend won't start
```powershell
# Check status
.\NATIVE_TOGGLE.ps1 status

# Check logs
Get-Content backend/logs/app.log -Tail 20

# Force stop and retry
.\NATIVE.ps1 -Stop
Start-Sleep -Seconds 3
.\NATIVE_TOGGLE.ps1 toggle
```

### Port already in use
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace XXXX with PID)
Stop-Process -Id XXXX -Force
```

### Database locked (SQLite)
```powershell
# Delete local database (will be recreated)
Remove-Item backend/data/student_management.db -ErrorAction SilentlyContinue
.\NATIVE_TOGGLE.ps1 toggle
```

### QNAP connection timeout
```powershell
# Verify QNAP is reachable
Test-NetConnection 172.16.0.2 -Port 55433

# Check backend logs for migration status
Get-Content backend/logs/migrations.log -Tail 20
```

---

## 🎯 Configuration Files

- **Main config:** `backend/.env`
- **Application logs:** `backend/logs/app.log`
- **Migration logs:** `backend/logs/migrations.log`
- **Database (SQLite):** `backend/data/student_management.db`
- **Desktop shortcut:** Check your Desktop for "SMS Native Toggle"

---

## ✅ Summary

You have **both modes configured and ready**:

1. **Development (SQLite)** - Default, fastest, use daily
2. **Testing (QNAP)** - Production-like, switch for integration tests

Simply **toggle between them** by editing one line in `backend/.env` and restarting.

Happy developing! 🚀
