# 🚀 Quick Start for New Users

**Fresh PC? Never used this before? Start here!**

## Step 1: Download the Application

Choose **ONE** method:

### Option A: With Git (Recommended)
```powershell
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
cd AUT_MIEEK_SMS
```

### Option B: Without Git
1. Go to https://github.com/bs1gr/AUT_MIEEK_SMS
2. Click green "Code" button → Download ZIP
3. Extract to `C:\AUT_MIEEK_SMS`
4. Open that folder

---

## Step 2: Run Validation (Optional but Recommended)

**Open PowerShell in the project folder**, then:

```powershell
.\VALIDATE_SETUP.ps1
```

This checks if your PC has everything needed and shows what to install.

---

## Step 3: Start the Application

**Just double-click:** `QUICKSTART.bat`

**Or in PowerShell:**
```powershell
.\QUICKSTART.ps1
```

That's it! The script will:
- ✅ Check what you have (Docker, Python, Node.js)
- ✅ Install any missing pieces
- ✅ Set up the database
- ✅ Start the application
- ✅ Open it in your browser

---

## 🆘 If Something Goes Wrong

### Problem: "Cannot run scripts"
**Solution:** Use `QUICKSTART.bat` instead of `.ps1` files

### Problem: "Python not found" or "Docker not found"
**Solution:** 

**Option A - Install Docker Desktop** (Easiest)
- Download: https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Wait for it to be ready (whale icon in system tray)
- Run `QUICKSTART.bat` again

**Option B - Install Python + Node.js**
- Python 3.11+: https://www.python.org/downloads/
  - ⚠️ Check "Add Python to PATH" during install!
- Node.js 18+: https://nodejs.org/
- Restart PowerShell
- Run `QUICKSTART.bat` again

### Problem: Still not working?
**Read the detailed guide:**
```powershell
# Open troubleshooting guide
notepad TROUBLESHOOTING.md

# Or run diagnostics
.\VALIDATE_SETUP.ps1 -Fix
```

---

## 📍 After It Starts

The application will open in your browser automatically at:

- **Docker mode**: http://localhost:8080
- **Native mode**: http://localhost:5173

### Useful URLs:
- **API Documentation**: http://localhost:8080/docs
- **Control Panel**: http://localhost:8080/control

---

## 🛑 How to Stop

```powershell
.\SMS.ps1 -Stop
```

Or use the interactive menu:
```powershell
.\SMS.ps1
# Choose option: Stop All Services
```

---

## 📚 Need More Help?

- **Full manual**: `README.md`
- **Greek guide**: `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Validate setup**: `.\VALIDATE_SETUP.ps1`

---

## ✅ Success Checklist

You'll know it's working when:
- [ ] No red error messages during startup
- [ ] Browser opens automatically
- [ ] You see the application interface
- [ ] URL works: http://localhost:8080 or http://localhost:5173

---

**That's it! You're ready to use the Student Management System! 🎉**
