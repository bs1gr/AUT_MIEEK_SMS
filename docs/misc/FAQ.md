# SMS Native Lite vvv1.18.25 - Frequently Asked Questions (FAQ)

**Version:** 1.0  
**Date:** May 31, 2026  
**Last Updated:** 2026-05-31  
**Scope:** Users, Administrators, IT Support Teams

---

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Basic Usage](#basic-usage)
- [Features & Functionality](#features--functionality)
- [Technical Issues](#technical-issues)
- [Performance & Optimization](#performance--optimization)
- [Security & Privacy](#security--privacy)
- [Database & Data](#database--data)
- [Networking & Remote Access](#networking--remote-access)
- [Troubleshooting](#troubleshooting)
- [Support & Contact](#support--contact)

---

## Installation & Setup

### Q1: How do I install SMS Native Lite?

**A:** SMS Native Lite doesn't require traditional installation. Simply:

1. Download `SMS_Native_Lite_Simple.exe`
2. Save it anywhere on your computer
3. Double-click to run
4. Browser opens automatically
5. Login and you're done!

No installation wizard, no registry changes, no system modifications needed.

---

### Q2: What are the system requirements?

**A:** Minimum requirements:
```
OS:       Windows 10/11 or Linux (Ubuntu 18.04+)
RAM:      512 MB minimum (1 GB recommended)
Storage:  100 MB free space
Network:  Local network connectivity
Port:     8000 (must be available)
Browser:  Chrome, Firefox, Edge, or Safari (any recent version)
```

Check system requirements in the HEADLESS_VERSION_GUIDE.md for detailed specs.

---

### Q3: Where should I save the executable?

**A:** Recommended locations:
```
Desktop           - Easy access, visible on desktop
Documents         - Organized, personal
Program Files     - Professional, permanent installation location
Network Share     - Shared access for multiple users
USB Drive         - Portable, can move between computers
Cloud Drive       - Synced across devices (OneDrive, Dropbox)
```

Any location works, choose based on your preference.

---

### Q4: Do I need administrator permissions to run SMS Lite?

**A:** No. SMS Native Lite runs as a regular user:
```
✓ No admin rights required
✓ No system registry access
✓ No system files modified
✓ Works in user's home directory
✓ Safe to run from network share
```

If running into permission issues, contact IT support.

---

### Q5: Can I run SMS Lite from a USB drive?

**A:** Yes! Completely portable:
```
Steps:
  1. Copy SMS_Native_Lite_Simple.exe to USB drive
  2. Plug USB into any computer
  3. Run the exe from USB
  4. Works immediately
  
Advantages:
  ✓ Portable between computers
  ✓ No installation needed
  ✓ Keep personal copy
  
Note:
  - First run slower from USB (copies to RAM)
  - Subsequent runs faster
  - Don't disconnect USB while running
```

---

## Basic Usage

### Q6: How do I create a desktop shortcut?

**A:** Easy shortcut creation:

**Windows:**
```
1. Find SMS_Native_Lite_Simple.exe
2. Right-click on it
3. Select "Send to" → "Desktop (Create Shortcut)"
4. Shortcut appears on desktop
5. Double-click shortcut to run
```

**Linux:**
```
1. Right-click on desktop
2. Select "Create Launcher"
3. Browse to exe location
4. Set name: "SMS Native Lite"
5. Click save
```

---

### Q7: Why doesn't my browser open automatically?

**A:** Several potential causes and solutions:

```
Cause 1: Browser blocked by antivirus
  → Solution: Add webbrowser to antivirus exceptions

Cause 2: Port not ready yet
  → Solution: Wait 10-15 seconds, manually open http://127.0.0.1:8000

Cause 3: Default browser not set
  → Solution: Set a default browser in Windows/Linux settings

Cause 4: Browser in "guest" mode
  → Solution: Disable guest mode or use different browser

Workaround:
  1. Run SMS_Native_Lite_Simple.exe
  2. Open browser manually (Chrome, Firefox, etc.)
  3. Type: http://127.0.0.1:8000
  4. Press Enter
  5. Ready to use!
```

---

### Q8: What's the login URL?

**A:** After starting the application, access it at:

```
Primary:   http://127.0.0.1:8000
Alternative: http://localhost:8000
```

Both URLs work the same - use whichever you prefer.

---

### Q9: What is the default login?

**A:** Default credentials provided for initial setup:

```
Email:    admin@sms-lite.app
Password: AdminPassword123!

⚠️ IMPORTANT: Change this password immediately on first login!
```

---

### Q10: How do I change my password?

**A:** Change password in application:

```
Steps:
  1. Login with current credentials
  2. Click user profile menu (top right)
  3. Select "Settings" or "Account"
  4. Find "Change Password" option
  5. Enter current password
  6. Enter new password (twice)
  7. Click "Update"
  8. Confirm success message
  
Password requirements:
  ✓ Minimum 12 characters
  ✓ Mix of upper and lowercase
  ✓ Include numbers and symbols
  ✓ No dictionary words
  ✓ Unique (don't reuse old passwords)
```

---

## Features & Functionality

### Q11: What features are included?

**A:** Complete SMS system with:

```
✓ Student Management    (Add, edit, delete, search)
✓ Course Management     (Create courses, manage enrollment)
✓ Grade Recording       (Enter grades, track performance)
✓ Attendance Tracking   (Mark present/absent, reports)
✓ Enrollment Management (Student enrollment)
✓ Data Import/Export    (CSV, Excel, PDF)
✓ Analytics & Reports   (Dashboards, statistics)
✓ User Management       (Admin controls)
✓ Role-Based Access     (Admin, Teacher, Student)
✓ Authentication        (Secure login, JWT tokens)
```

Total of 291 API endpoints available.

---

### Q12: Can I import data from Excel?

**A:** Yes, import/export is fully supported:

```
Supported formats:
  ✓ Excel (.xlsx)
  ✓ CSV (.csv)
  ✓ Tab-separated (.tsv)

Data types:
  ✓ Student lists
  ✓ Course information
  ✓ Grades
  ✓ Attendance records
  ✓ Enrollment data

Steps:
  1. Click "Import/Export" menu
  2. Select "Import"
  3. Choose file (xlsx, csv)
  4. Map columns if needed
  5. Preview data
  6. Click "Import"
  7. Success confirmation
```

See USER_TRAINING_GUIDE.md for detailed instructions.

---

### Q13: How do I export grades?

**A:** Export grades easily:

```
Steps:
  1. Click "Grades" menu
  2. Filter if needed (course, date, student)
  3. Click "Export" button
  4. Choose format:
     - Excel (.xlsx)
     - CSV (.csv)
     - PDF (.pdf)
  5. Click "Download"
  6. File saved to Downloads folder
  
File naming:
  grades_2026-05-31.xlsx
  grades_COURSEID_SEMESTER.csv
  
Tip:
  Include date in filename
  Date naming makes organization easier
```

---

### Q14: Can multiple people use the same login?

**A:** Not recommended, but technically possible:

```
⚠️ NOT RECOMMENDED because:
  ✗ No audit trail of who did what
  ✗ Can't track changes
  ✗ Password security weak
  ✗ Violates security policy
  
Better approach:
  ✓ Each person gets own login
  ✓ Admin creates accounts
  ✓ Each person changes password
  ✓ Full audit trail maintained
  ✓ Better security
  
How to get your own account:
  1. Ask your administrator
  2. They create account
  3. You change password on first login
  4. You're all set!
```

---

### Q15: What user roles are available?

**A:** Three main roles with different permissions:

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| View Dashboard | ✓ | ✓ | ✓ |
| Manage Students | ✓ | - | - |
| Manage Courses | ✓ | ✓ | - |
| Record Grades | ✓ | ✓ | - |
| Track Attendance | ✓ | ✓ | - |
| View Own Grades | ✓ | ✓ | ✓ |
| View Own Courses | ✓ | ✓ | ✓ |
| Manage Users | ✓ | - | - |
| System Settings | ✓ | - | - |
| Reports | ✓ | ✓ | - |

---

## Technical Issues

### Q16: Port 8000 is already in use, what do I do?

**A:** Port conflict resolution:

```
Windows:
  Step 1: Find what's using port 8000
    netstat -ano | findstr :8000
  
  Step 2: Kill the process
    taskkill /PID [PID_NUMBER] /F
  
  Step 3: Start SMS Lite again
    Double-click SMS_Native_Lite_Simple.exe

Linux:
  Step 1: Find process
    lsof -i :8000
    
  Step 2: Kill process
    kill -9 [PID]
    
  Step 3: Restart
    ./SMS_Native_Lite_Simple.exe
```

If issue persists, contact IT support.

---

### Q17: Application crashes on startup, what should I do?

**A:** Troubleshooting crash issues:

```
Step 1: Check debug log
  Location: %LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log
  Look for: ERROR or error messages
  
Step 2: Try these fixes
  ✓ Restart computer
  ✓ Check port 8000 is free
  ✓ Verify 512 MB RAM available
  ✓ Check 100 MB storage free
  
Step 3: Reinstall
  ✓ Delete SMS_Native_Lite_Simple.exe
  ✓ Delete AppData folder: %LOCALAPPDATA%\SMS_Native_Lite_Simple\
  ✓ Redownload exe
  ✓ Run again
  
Step 4: Contact IT
  If still crashes:
  - Provide debug log contents
  - Include error messages
  - Describe what you were doing
  - System specifications
```

---

### Q18: The application is very slow, how can I speed it up?

**A:** Performance optimization tips:

```
Quick fixes:
  ✓ Restart the application
  ✓ Close other programs
  ✓ Check available RAM (Task Manager)
  ✓ Close browser tabs you're not using
  
Network optimization:
  ✓ Use wired connection (not WiFi)
  ✓ Move closer to router
  ✓ Check network congestion
  ✓ Test with: ping 127.0.0.1
  
System optimization:
  ✓ Free up disk space (delete temp files)
  ✓ Disable visual effects
  ✓ Update browser
  ✓ Disable browser extensions
  
Database optimization:
  ✓ If using QNAP: check QNAP server
  ✓ If using SQLite: database is local
  ✓ Check for database corruption
  ✓ Try exporting and re-importing data
```

---

### Q19: I'm getting "Database Error" message, what does it mean?

**A:** Database error troubleshooting:

```
Possible causes:

1. Database file corrupted
   Fix: Delete and restart (data loss)
   Location: %LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db
   
2. Disk space full
   Fix: Free up disk space
   Check: Properties of C:\ drive
   
3. File permissions problem
   Fix: Check file permissions
   Try: Run as administrator
   
4. QNAP connection issue (if using PostgreSQL)
   Fix: Check network connectivity
   Test: ping qnap.company.local
   Check: Credentials are correct
   
5. Database locked by another instance
   Fix: Close all SMS instances
   Check: Task Manager for duplicate processes
   Kill: taskkill /IM SMS*.exe /F
   
Contact IT if error persists after trying these steps.
```

---

## Performance & Optimization

### Q20: What factors affect performance?

**A:** Performance depends on several factors:

```
System Hardware:
  ✓ RAM: More RAM = Better performance
  ✓ CPU: Faster CPU = Faster responses
  ✓ Storage: SSD faster than HDD
  ✓ Network: Faster network = Quicker API calls
  
Application Configuration:
  ✓ Database type: PostgreSQL faster than SQLite
  ✓ Number of records: More data = Slower queries
  ✓ User load: More concurrent users = Slower
  ✓ Open features: More open = More resources
  
Environmental Factors:
  ✓ Other running programs
  ✓ Background updates
  ✓ Network congestion
  ✓ Server load (if using PostgreSQL)
```

---

### Q21: How many users can use it concurrently?

**A:** Concurrent user capacity depends on setup:

```
SQLite Database (Local):
  ✓ Single-user: 1 person at a time
  ⚠️ Multiple users on same machine: Performance degrades
  Recommended: 1 user per machine maximum

PostgreSQL Database (QNAP):
  ✓ Multiple users: 10-20 concurrent users
  ⚠️ Depends on network bandwidth
  ⚠️ Depends on QNAP server capacity
  Recommended: Test your specific network setup

For higher capacity:
  - Use PostgreSQL instead of SQLite
  - Upgrade QNAP server hardware
  - Optimize network connections
  - Monitor performance under load
```

---

## Security & Privacy

### Q22: Is my data secure?

**A:** Multiple security layers:

```
Authentication:
  ✓ Username/password login required
  ✓ JWT token-based sessions
  ✓ Password hashing (passlib)
  ✓ Session timeout (auto-logout)

Authorization:
  ✓ Role-based access control (RBAC)
  ✓ User can only see their data
  ✓ Teachers see their students
  ✓ Students see their grades
  ✓ Admins see everything

Encryption:
  ✓ Database file can be encrypted (Windows BitLocker)
  ✓ Network traffic unencrypted (use VPN for remote)
  ✓ Credentials stored securely

Your responsibility:
  ✓ Change default password
  ✓ Don't share credentials
  ✓ Lock computer when away
  ✓ Use strong passwords
  ✓ Report suspicious activity
```

---

### Q23: Should I use the default password?

**A:** Absolutely not! Change immediately:

```
Default password:
  admin@sms-lite.app / AdminPassword123!
  
⚠️ This is ONLY for initial setup
⚠️ Everyone knows this password
⚠️ Anyone could access your system
⚠️ Change on FIRST LOGIN
⚠️ Never use again

How to change:
  1. Login with default credentials
  2. Click "Settings" or "Account"
  3. Select "Change Password"
  4. Enter current (default) password
  5. Enter new strong password (twice)
  6. Click "Update"
  
New password requirements:
  ✓ Minimum 12 characters
  ✓ Include uppercase letters (A-Z)
  ✓ Include lowercase letters (a-z)
  ✓ Include numbers (0-9)
  ✓ Include symbols (!@#$%^&*)
  ✓ Unique (don't reuse old passwords)
```

---

### Q24: What information is logged?

**A:** Audit logs track activity:

```
Information logged:
  ✓ Login attempts (successful and failed)
  ✓ Data created/modified/deleted
  ✓ Who made changes (username)
  ✓ When changes made (timestamp)
  ✓ What changed (specific fields)
  ✓ Error messages
  ✓ System events

Information NOT logged:
  ✗ Passwords (stored as hashes)
  ✗ Browsing history
  ✗ Unrelated system information
  ✗ Personal data beyond school records

Access to logs:
  ✓ Administrators can view logs
  ✓ Used for auditing and compliance
  ✓ Retained for X months (policy dependent)
  ✓ Deleted after retention period
```

---

## Database & Data

### Q25: How is my data stored?

**A:** Two storage options:

```
Option 1: Local SQLite (Default)
  Location: %LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db
  Type: File-based database
  Access: Single computer
  Backup: Manual (copy sms_lite.db)
  Pros:
    ✓ No network needed
    ✓ Works offline
    ✓ Easy to backup
    ✓ Portable
  Cons:
    ✗ Can't share with others
    ✗ Single user only
    ✗ Slower with large datasets

Option 2: QNAP PostgreSQL (Centralized)
  Location: QNAP server (network)
  Type: Relational database
  Access: Multiple computers
  Backup: QNAP handles
  Pros:
    ✓ Shared access
    ✓ Multiple users
    ✓ Automatic backup
    ✓ Faster for large data
  Cons:
    ✗ Requires network
    ✗ Requires QNAP setup
    ✗ Network dependent
```

---

### Q26: How do I backup my data?

**A:** Backup strategies:

```
For SQLite (Local):
  Manual backup:
    1. Navigate: %LOCALAPPDATA%\SMS_Native_Lite_Simple\
    2. Copy: sms_lite.db
    3. Save: USB drive, cloud, external drive
    4. Frequency: Weekly or before important changes
  
  Automated backup:
    1. Use Windows backup (System Image)
    2. Or third-party: Backblaze, Carbonite
    3. Check backup regularly
    4. Test restore process

For PostgreSQL (QNAP):
  QNAP handles backup:
    1. Automatic nightly backup
    2. Stored on QNAP NAS
    3. Contact IT for restore
  
  Manual export:
    1. Export data from application
    2. Save exported files
    3. Keep in multiple locations
```

---

### Q27: Can I restore from backup?

**A:** Data recovery process:

```
If using SQLite:
  Step 1: Close SMS Lite application
  Step 2: Delete corrupted file
    Delete: %LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db
  
  Step 3: Restore from backup
    Copy backup file to: %LOCALAPPDATA%\SMS_Native_Lite_Simple\
    Rename: sms_lite.db
  
  Step 4: Restart application
    Run: SMS_Native_Lite_Simple.exe
    Verify: Data restored correctly
  
If using PostgreSQL:
  Step 1: Contact IT support
  Step 2: Request restore
  Step 3: Specify restore date
  Step 4: IT performs restore on QNAP
  Step 5: You access restored data
```

---

## Networking & Remote Access

### Q28: Can I access SMS Lite from home?

**A:** Default behavior and options:

```
Default (No Remote Access):
  ✗ Cannot access from outside office network
  ✗ Only works on local machine/office network
  ✓ This is secure by design
  ✓ No internet exposure

To enable remote access:
  Option 1: VPN
    1. Connect to company VPN
    2. Acts like you're in office
    3. Then access http://127.0.0.1:8000
    4. Works just like in office
  
  Option 2: Reverse Proxy
    1. IT sets up reverse proxy
    2. Adds HTTPS encryption
    3. Access via: https://sms-lite.company.com
    4. Secure over internet
  
  Option 3: Remote Desktop
    1. RDP into office computer
    2. Run SMS Lite there
    3. Works but slower
    4. Requires office computer running

Contact IT to set up remote access!
```

---

### Q29: What is the difference between 127.0.0.1 and localhost?

**A:** Both are identical:

```
127.0.0.1
  - IP address format
  - Loopback IP (refers to your computer)
  - URL: http://127.0.0.1:8000

localhost
  - Hostname format
  - Same as 127.0.0.1
  - URL: http://localhost:8000

They're the same thing - use whichever you prefer!

You CANNOT access another computer using:
  ✗ http://127.0.0.1:8000 (goes to your computer)
  ✗ http://localhost:8000 (goes to your computer)

To access from network:
  ✓ Use computer's IP address
  ✓ Or computer's hostname
  ✓ Example: http://office-pc:8000 (if allowed)
  ✓ Or: http://192.168.1.100:8000
```

---

## Troubleshooting

### Q30: Application won't start, what should I do?

**A:** Systematic troubleshooting:

```
Step 1: Verify system requirements
  ✓ OS: Windows 10+ or Linux
  ✓ RAM: At least 512 MB available
  ✓ Storage: 100 MB free
  ✓ Port 8000: Not in use

Step 2: Check debug log
  Location: %LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log
  Look for: ERROR or error messages
  Share with IT: Include log contents

Step 3: Try safe restart
  1. Delete: %LOCALAPPDATA%\SMS_Native_Lite_Simple\
  2. Restart computer
  3. Run: SMS_Native_Lite_Simple.exe
  4. Starts fresh (recreates folders)

Step 4: Reinstall
  1. Delete: SMS_Native_Lite_Simple.exe
  2. Redownload: Fresh copy
  3. Run: New exe
  
Step 5: Contact IT
  If still failing:
  - Send debug log
  - Include error messages
  - List steps already tried
  - System specifications
```

---

### Q31: I'm locked out of my account, what do I do?

**A:** Account recovery process:

```
If you forgot password:
  ✓ Contact your administrator
  ✓ They reset your password
  ✓ They give you temporary credentials
  ✓ Change password on next login
  ✓ You're back in!

If account is locked (too many login attempts):
  ✓ Wait 15-30 minutes (auto-unlock)
  ✓ Or contact administrator
  ✓ They can unlock immediately
  
If someone changed your password:
  ✓ Contact administrator
  ✓ They can reset it
  ✓ Or create new account
  ✓ You change password when logged in

Prevention:
  ✓ Use secure password (don't forget it!)
  ✓ Store in password manager
  ✓ Write down somewhere safe
  ✓ Don't share credentials
```

---

### Q32: Error message: "Cannot connect to server"

**A:** Connection troubleshooting:

```
This error means:
  ✗ SMS application not running
  ✗ Port 8000 not responding
  ✗ Server crashed
  ✗ Firewall blocking

Solutions:

1. Start the server
  - Close current browser
  - Double-click: SMS_Native_Lite_Simple.exe
  - Wait 10 seconds for startup
  - Browser opens automatically

2. Manual connection
  - Run: SMS_Native_Lite_Simple.exe
  - Open browser
  - Type: http://127.0.0.1:8000
  - Press Enter

3. Check port
  - netstat -ano | findstr :8000
  - If not listed, server not running
  - Start application again

4. Restart everything
  - Close browser
  - Stop SMS Lite
  - Restart computer
  - Run SMS Lite again

5. Check firewall
  - Windows Defender → Firewall → Allow apps
  - Check if Python/SMS blocked
  - Allow if needed

Contact IT if persists!
```

---

## Support & Contact

### Q33: How do I report a bug?

**A:** Effective bug reporting:

```
When reporting a bug, include:

Required information:
  ✓ What you were trying to do
  ✓ What happened instead
  ✓ Error message (if any)
  ✓ Steps to reproduce
  ✓ Your operating system
  ✓ Your browser type/version

Helpful additions:
  ✓ Screenshots
  ✓ Debug log (from AppData folder)
  ✓ When did it start (today, this week)
  ✓ Does it always happen or sometimes
  ✓ Any recent changes to system
  ✓ What you already tried

Example:
  "I tried to add a new student on Monday.
  I filled all required fields.
  Clicked Save and got error: 'Database Error'.
  The student wasn't added.
  Windows 11, Chrome 91, this started yesterday.
  Debug log attached."
  
Contact: sms-support@company.com
```

---

### Q34: What's the expected response time for support?

**A:** Support response times:

```
Severity levels:

CRITICAL (System down, data loss risk):
  Response: 1 hour
  Example: Cannot login, data corrupted
  
HIGH (Major feature broken):
  Response: 4 hours
  Example: Cannot save grades, data access slow
  
MEDIUM (Feature limitation):
  Response: 24 hours
  Example: Export button not working
  
LOW (Questions, documentation):
  Response: 48 hours
  Example: How do I add a student?

Contact information:
  Email: sms-support@company.com
  Phone: ext. 2000
  Hours: Monday-Friday 8 AM - 5 PM
  Emergency: Call IT desk directly
```

---

### Q35: How do I request a feature?

**A:** Feature request process:

```
Submitting a feature request:

1. Email to: sms-support@company.com
   Subject: "Feature Request: [Feature Name]"

2. Include in email:
  ✓ Feature description
  ✓ Why you need it
  ✓ How it would help
  ✓ How often you'd use it
  ✓ Any examples/screenshots

3. Development team:
  ✓ Reviews request
  ✓ Evaluates feasibility
  ✓ Considers priority
  ✓ Adds to roadmap if accepted
  ✓ Updates you on status

Timeline:
  ✓ Feature requests reviewed monthly
  ✓ Development: 2-4 weeks
  ✓ Deployment: Next release cycle
  ✓ You'll be notified when available

Remember:
  ✓ Be specific about your need
  ✓ Explain business value
  ✓ Be patient (competing priorities)
  ✓ Check if feature already exists!
```

---

## Final Questions

### Q36: Is there anything else I should know?

**A:** Summary of key points:

```
DO:
  ✓ Read the User Training Guide
  ✓ Change default password
  ✓ Backup data regularly
  ✓ Keep software updated
  ✓ Report issues to support
  ✓ Ask questions (no stupid questions!)
  ✓ Use strong passwords
  ✓ Lock computer when away

DON'T:
  ✗ Use default password
  ✗ Share credentials
  ✗ Write passwords on paper
  ✗ Ignore error messages
  ✗ Run multiple instances
  ✗ Store sensitive data unencrypted
  ✗ Disable security features
  ✗ Manually edit database file

REMEMBER:
  → Help is available
  → Guides are comprehensive
  → IT support is responsive
  → Your data is important
  → Security matters
  → Updates are necessary
  → Communication is key
```

---

### Q37: Where can I find more help?

**A:** Support resources:

```
Documentation:
  📖 USER_TRAINING_GUIDE.md
     Complete user training (30 minutes)
  📖 HEADLESS_VERSION_GUIDE.md
     Technical guide for admin
  📖 dist/README.md
     Quick reference
  📖 IT_DEPLOYMENT_GUIDE.md
     For IT administrators

Online Help:
  ? Help icon in application
  📚 Knowledge base (company intranet)
  🎥 Video tutorials (if available)
  📱 FAQ (this document)

People:
  👨‍💼 Your administrator
  👨‍💻 IT help desk
  🆘 Support team: sms-support@company.com
  📞 Phone: ext. 2000

Training:
  👥 Group training sessions
  1️⃣ One-on-one training
  🎓 Online course (if available)
  📝 Self-paced learning materials
```

---

## Quick Reference

### Common Keyboard Shortcuts

```
Ctrl+S    Save
Ctrl+A    Select All
Ctrl+C    Copy
Ctrl+V    Paste
Ctrl+F    Find/Search
Ctrl+P    Print
Escape    Cancel/Close
Enter     Submit Form
Tab       Next Field
```

### Important Folders

```
Windows:
  AppData:     %LOCALAPPDATA%\SMS_Native_Lite_Simple\
  Database:    %LOCALAPPDATA%\SMS_Native_Lite_Simple\sms_lite.db
  Debug Log:   %LOCALAPPDATA%\SMS_Native_Lite_Simple\debug.log

Linux:
  AppData:     ~/.local/share/SMS_Native_Lite_Simple/
  Database:    ~/.local/share/SMS_Native_Lite_Simple/sms_lite.db
  Debug Log:   ~/.local/share/SMS_Native_Lite_Simple/debug.log
```

### Important URLs

```
Application:    http://127.0.0.1:8000
Alternative:    http://localhost:8000
Support Email:  sms-support@company.com
Support Phone:  ext. 2000
```

---

## Feedback

Have a question not answered here?

**Contact us:**
- Email: sms-support@company.com
- Phone: ext. 2000
- Ask: Your IT administrator

Your feedback helps us improve!

---

**Document Status:** ✅ Complete  
**Last Updated:** 2026-05-31  
**Version:** 1.0

*SMS Native Lite vvv1.18.25 - FAQ*

*Questions answered. Problems solved. Success assured.* ✅


