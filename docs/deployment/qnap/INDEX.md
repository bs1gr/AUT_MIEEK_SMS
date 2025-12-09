# QNAP NAS Deployment Documentation

Complete deployment guides for Student Management System on QNAP NAS devices.

---

## 📖 Documentation Structure

### Quick Start Guides

| File | Description | For Who |
|------|-------------|---------|
| **[README.md](README.md)** | Quick Container Station deployment (port 8080) | Everyone - Start here |
| **[00-DEPLOYMENT-OPTIONS.md](00-DEPLOYMENT-OPTIONS.md)** | Compare all deployment methods | Decision makers |

### Production Deployment

| File | Description | For Who |
|------|-------------|---------|
| **[01-VIRTUAL-HOST-SETUP.md](01-VIRTUAL-HOST-SETUP.md)** | Professional virtual hosting with custom domains | Production deployments |

### ARM Architecture (TS-431P3 and Similar)

| File | Description | For Who |
|------|-------------|---------|
| **[ARM-TS431P3-COMPATIBILITY.md](ARM-TS431P3-COMPATIBILITY.md)** | Compatibility assessment for ARM QNAP | ARM QNAP owners |
| **[ARM-TS431P3-BUILD-GUIDE.md](ARM-TS431P3-BUILD-GUIDE.md)** | Step-by-step ARM deployment guide | TS-431P3 users (8GB) |

---

## 🚀 Which Guide Should I Use?

### For x86_64 QNAP (Intel/AMD Celeron)

**Models:** TS-453D, TS-253E, TS-x53D/E series, TS-x73A series

```
1. Quick Start → README.md
2. Production → 01-VIRTUAL-HOST-SETUP.md
```

**No ARM builds needed** - use standard `docker-compose.qnap.yml`

---

### For ARM QNAP (TS-431P3, TS-x31P)

**Models:** TS-431P3, TS-231P3, TS-x31P series, TS-x28A series

```
1. Check Compatibility → ARM-TS431P3-COMPATIBILITY.md
2. Build ARM Images → ARM-TS431P3-BUILD-GUIDE.md
3. (Optional) Virtual Host → 01-VIRTUAL-HOST-SETUP.md
```

**ARM builds required** - use `docker-compose.qnap.arm32v7.yml`

---

## 🔍 Quick Decision Tree

```
Do you have a QNAP NAS?
├─ YES → What architecture?
│  ├─ Intel/AMD (x86_64)
│  │  ├─ Quick test? → README.md
│  │  └─ Production? → 01-VIRTUAL-HOST-SETUP.md
│  │
│  └─ ARM (Cortex-A15)
│     ├─ Check RAM → ARM-TS431P3-COMPATIBILITY.md
│     ├─ 2GB RAM? → ❌ Upgrade to 8GB first
│     ├─ 4GB RAM? → ⚠️ Proceed with caution
│     └─ 8GB RAM? → ✅ ARM-TS431P3-BUILD-GUIDE.md
│
└─ NO → See main deployment docs
```

---

## 📋 File Organization

```
docs/deployment/qnap/
├── INDEX.md                          # This file - navigation guide
├── README.md                         # Quick start (x86_64, port 8080)
├── 00-DEPLOYMENT-OPTIONS.md          # Compare all methods
├── 01-VIRTUAL-HOST-SETUP.md          # Production virtual hosting
├── ARM-TS431P3-COMPATIBILITY.md      # ARM compatibility check
└── ARM-TS431P3-BUILD-GUIDE.md        # ARM build instructions
```

**Related Files:**

```
docker/
├── Dockerfile.backend.qnap           # x86_64 backend (standard)
├── Dockerfile.frontend.qnap          # x86_64 frontend (standard)
├── docker-compose.qnap.yml           # x86_64 deployment
│
├── Dockerfile.backend.arm32v7        # ARM32v7 backend (TS-431P3)
├── Dockerfile.frontend.arm32v7       # ARM32v7 frontend (TS-431P3)
├── docker-compose.qnap.arm32v7.yml   # ARM deployment
└── README.ARM.md                     # ARM vs x86_64 guide
```

---

## 🎯 Deployment Paths

### Path 1: Simple Container Deployment (x86_64)

**Time:** 15-30 minutes
**Access:** `http://QNAP_IP:8080`
**Guide:** [README.md](README.md)

```bash
# One command deployment
docker compose -f docker/docker-compose.qnap.yml up -d
```

---

### Path 2: Virtual Host Deployment (x86_64)

**Time:** 30-60 minutes
**Access:** `https://sms.yourdomain.com`
**Guide:** [01-VIRTUAL-HOST-SETUP.md](01-VIRTUAL-HOST-SETUP.md)

```bash
# Requires domain + QNAP Web Server setup
# Professional URLs with SSL
```

---

### Path 3: ARM Container Deployment (TS-431P3)

**Time:** 2-3 hours (includes build)
**Access:** `http://QNAP_IP:8080`
**Guides:**

1. [ARM-TS431P3-COMPATIBILITY.md](ARM-TS431P3-COMPATIBILITY.md)
2. [ARM-TS431P3-BUILD-GUIDE.md](ARM-TS431P3-BUILD-GUIDE.md)

```bash
# Build ARM images (60-90 min)
docker build -f docker/Dockerfile.backend.arm32v7 -t sms-backend-arm32v7:latest .
docker build -f docker/Dockerfile.frontend.arm32v7 -t sms-frontend-arm32v7:latest .

# Deploy
docker compose -f docker/docker-compose.qnap.arm32v7.yml up -d
```

---

### Path 4: ARM Virtual Host (TS-431P3 + Custom Domain)

**Time:** 3-4 hours total
**Access:** `https://sms.yourdomain.com`
**Guides:**

1. [ARM-TS431P3-BUILD-GUIDE.md](ARM-TS431P3-BUILD-GUIDE.md)
2. [01-VIRTUAL-HOST-SETUP.md](01-VIRTUAL-HOST-SETUP.md)

```bash
# Combine ARM builds + virtual hosting
# Most professional setup for ARM QNAP
```

---

## ⚙️ Architecture Detection

### How to Check Your QNAP Architecture

**SSH Method:**

```bash
ssh admin@YOUR_QNAP_IP
uname -m

# Output:
# x86_64  → Use standard files (README.md)
# armv7l  → Use ARM files (ARM-TS431P3-*.md)
# aarch64 → Contact support (ARM64, not covered)
```

**Model Number Method:**

| Model Pattern | Architecture | Use |
|--------------|--------------|-----|
| TS-x53D/E, TS-x73A | x86_64 | Standard guides |
| TS-x31P, TS-x28A | ARM32v7 | ARM guides |
| TS-x32P, TS-464 | ARM64 | Not yet supported |

---

## 📊 Feature Comparison

| Feature | Standard (x86_64) | ARM (TS-431P3) |
|---------|------------------|----------------|
| **Deployment Time** | 15-30 min | 2-3 hours |
| **Build Required** | No (pre-built) | Yes (local build) |
| **Performance** | Baseline | 20-30% slower |
| **Max Users** | 30-40 | 20-25 |
| **RAM Requirement** | 4GB (8GB rec) | 8GB required |
| **Virtual Hosting** | ✅ Yes | ✅ Yes |
| **SSL/HTTPS** | ✅ Yes | ✅ Yes |
| **Monitoring Stack** | ✅ Yes | ⚠️ Optional |

---

## 🆘 Getting Help

### Before Starting

1. **Check your model** - Determine x86_64 vs ARM
2. **Check your RAM** - Minimum 4GB, 8GB recommended (required for ARM)
3. **Check disk space** - Minimum 20GB available
4. **Read deployment options** - [00-DEPLOYMENT-OPTIONS.md](00-DEPLOYMENT-OPTIONS.md)

### Common Issues

| Issue | Guide Section |
|-------|---------------|
| Architecture detection | This file → Architecture Detection |
| ARM compatibility | ARM-TS431P3-COMPATIBILITY.md |
| Virtual host setup | 01-VIRTUAL-HOST-SETUP.md → Phase 4 |
| SSL certificate | 01-VIRTUAL-HOST-SETUP.md → Phase 5 |
| Performance tuning | ARM-TS431P3-BUILD-GUIDE.md → Phase 7 |

### Support Resources

- **GitHub Issues:** Project repository
- **QNAP Community:** [forum.qnap.com](https://forum.qnap.com)
- **Main Docs:** [../DEPLOY.md](../DEPLOY.md)

---

## 📝 Version Information

- **SMS Version:** 1.9.3
- **Documentation Date:** 2025-11-28
- **Covers QNAP Models:** TS-431P3 (ARM), TS-453D+ (x86_64), and similar
- **Container Station:** 3.x compatible

---

## 🔄 Migration Paths

### From Port 8080 to Virtual Host

See [01-VIRTUAL-HOST-SETUP.md](01-VIRTUAL-HOST-SETUP.md) → Appendix D

### From x86_64 to ARM (Not Recommended)

Requires complete rebuild. Better to keep x86_64 QNAP for production.

### From ARM to x86_64

Database and data are portable. Rebuild images for x86_64, migrate data volumes.

---

**Last Updated:** 2025-11-28
**Maintainer:** Student Management System Team
**License:** Same as main project
