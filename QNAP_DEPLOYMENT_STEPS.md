# QNAP Deployment - Quick Reference
## Student Management System v1.8.0

**Date:** 2025-11-19  
**QNAP IP:** 172.16.0.2

---

## ✅ Configuration Summary

### Network
- **Internal URL:** http://172.16.0.2:8082
- **External URL:** http://77.83.249.220:8082
- **Domain:** http://konaki.myqnapcloud.com:8082

### Monitoring (Enabled)
- **Grafana:** http://172.16.0.2:3000
- **Prometheus:** http://172.16.0.2:9090

### Ports
- Web Interface: **8082** (avoids QNAP's 8080)
- Grafana: **3000**
- Prometheus: **9090**
- PostgreSQL: **5432** (internal only)

### Storage Paths
- Database: `/share/Container/sms-postgres`
- Backups: `/share/Container/sms-backups`
- Logs: `/share/Container/sms-logs`
- Monitoring: `/share/Container/sms-monitoring`

---

## 🚀 Deployment Steps

### Step 1: Connect to QNAP
```bash
ssh admin@172.16.0.2
```

### Step 2: Navigate to Container Directory
```bash
cd /share/Container
```

### Step 3: Clone Repository
```bash
git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git sms
cd sms
```

### Step 4: Upload Configuration File

Choose one method:

**Method A: Copy/Paste via SSH**
```bash
nano /share/Container/sms/.env.qnap
# Copy content from: d:/SMS/student-management-system/.env.qnap
# Paste and save (Ctrl+O, Enter, Ctrl+X)
```

**Method B: File Station (Browser)**
1. Open QNAP File Station
2. Navigate to: `Container/sms/`
3. Upload `.env.qnap` from your PC

**Method C: SCP from Windows**
```powershell
# Run from: d:/SMS/student-management-system/
scp .env.qnap admin@172.16.0.2:/share/Container/sms/
```

### Step 5: Make Installation Script Executable
```bash
chmod +x scripts/qnap/install-qnap.sh
```

### Step 6: Run Installation
```bash
./scripts/qnap/install-qnap.sh
```

The installer will:
- ✅ Check prerequisites (Docker, Container Station, ports)
- ✅ Verify available disk space (needs 10GB+)
- ✅ Create required directories
- ✅ Build Docker images (backend, frontend, postgres)
- ✅ Start all containers
- ✅ Run health checks
- ✅ Display access URLs

**Installation time:** ~10-15 minutes (depending on QNAP hardware)

---

## 📊 Post-Installation

### Access the Application
- **Main App:** http://172.16.0.2:8082
- **Grafana:** http://172.16.0.2:3000 (admin/[see .env.qnap])
- **Prometheus:** http://172.16.0.2:9090

### Management Commands

All management via SSH on QNAP:

```bash
cd /share/Container/sms

# Interactive management menu (12 options)
./scripts/qnap/manage-qnap.sh

# Quick commands
./scripts/qnap/manage-qnap.sh start         # Start services
./scripts/qnap/manage-qnap.sh stop          # Stop services
./scripts/qnap/manage-qnap.sh status        # Check status
./scripts/qnap/manage-qnap.sh logs          # View logs
./scripts/qnap/manage-qnap.sh backup        # Create backup
./scripts/qnap/manage-qnap.sh update        # Update application
```

### Check Container Status
```bash
docker ps
```

Expected containers:
- `sms-backend` (port 8000, internal)
- `sms-frontend` (port 8082, public)
- `sms-postgres` (port 5432, internal)
- `sms-prometheus` (port 9090, public)
- `sms-grafana` (port 3000, public)

---

## 🔐 Security Notes

### Generated Credentials
All credentials are in `.env.qnap` file:
- Database password (POSTGRES_PASSWORD)
- Application secret (SECRET_KEY)
- Admin token (ADMIN_SHUTDOWN_TOKEN)
- Grafana password (GRAFANA_PASSWORD)

**⚠️ Keep .env.qnap file secure! Never commit to git.**

### First Login
Default Grafana credentials:
- Username: `admin`
- Password: See `GRAFANA_PASSWORD` in `.env.qnap`

**Change password after first login!**

---

## 🌐 External Access Setup (Optional)

To access from outside your network:

### Option 1: Port Forwarding
Configure your router:
- External Port: **8082** → QNAP IP: **172.16.0.2:8082**
- Access via: http://77.83.249.220:8082

### Option 2: myQNAPcloud
1. QNAP Control Panel → myQNAPcloud
2. Enable myQNAPcloud
3. Configure custom port: 8082
4. Access via: http://konaki.myqnapcloud.com:8082

### Recommended: Add SSL/TLS
For production external access, consider:
- QNAP's built-in SSL certificate
- Let's Encrypt via myQNAPcloud
- Reverse proxy with SSL

---

## 🔧 Troubleshooting

### Check Logs
```bash
cd /share/Container/sms
./scripts/qnap/manage-qnap.sh logs
```

### Check Health
```bash
curl http://172.16.0.2:8082/api/v1/health
```

### Restart Services
```bash
./scripts/qnap/manage-qnap.sh restart
```

### Rollback to Backup
```bash
./scripts/qnap/rollback-qnap.sh
```

### Full Documentation
- Installation: `docs/qnap/QNAP_INSTALLATION_GUIDE.md`
- Management: `docs/qnap/QNAP_MANAGEMENT_GUIDE.md`
- Troubleshooting: `docs/qnap/QNAP_TROUBLESHOOTING_GUIDE.md`

---

## 📞 Support

If you encounter issues:
1. Check logs: `./scripts/qnap/manage-qnap.sh logs`
2. Review documentation in `docs/qnap/`
3. Verify prerequisites (RAM, disk space, ports)
4. Check Container Station is running

---

## ✅ Verification Checklist

After installation, verify:

- [ ] All containers running: `docker ps`
- [ ] Web interface accessible: http://172.16.0.2:8082
- [ ] Health check passing: http://172.16.0.2:8082/api/v1/health
- [ ] Grafana accessible: http://172.16.0.2:3000
- [ ] Prometheus accessible: http://172.16.0.2:9090
- [ ] Database backup created: Check `/share/Container/sms-backups/`
- [ ] Logs being written: Check `/share/Container/sms-logs/`

---

**Configuration file location:** `d:/SMS/student-management-system/.env.qnap`  
**Documentation:** https://github.com/bs1gr/AUT_MIEEK_SMS/tree/main/docs/qnap
