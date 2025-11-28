# ARM Build Files for QNAP NAS

**Version:** 1.9.3
**Architecture:** ARM32v7
**Target Devices:** QNAP TS-431P3, TS-x31P series, and other ARM-based QNAP NAS

---

## Overview

This directory contains **separate ARM-specific build files** that allow deployment on ARM-based QNAP NAS devices without modifying the main v1.9.3 release builds.

### Why Separate Files?

- ✅ **Preserve main builds** - Standard x86_64 builds remain untouched
- ✅ **Version consistency** - ARM builds track v1.9.3 release
- ✅ **Clear separation** - No confusion between architectures
- ✅ **Easy maintenance** - Update ARM builds independently

---

## File Organization

### ARM-Specific Files (ARM QNAP ONLY)

| File | Purpose | Use Case |
|------|---------|----------|
| `Dockerfile.backend.arm32v7` | ARM backend build | TS-431P3 and ARM QNAP |
| `Dockerfile.frontend.arm32v7` | ARM frontend build | TS-431P3 and ARM QNAP |
| `docker-compose.qnap.arm32v7.yml` | ARM deployment config | TS-431P3 and ARM QNAP |

### Standard Files (x86_64 QNAP)

| File | Purpose | Use Case |
|------|---------|----------|
| `Dockerfile.backend.qnap` | x86_64 backend build | Intel/AMD QNAP (TS-453D, etc.) |
| `Dockerfile.frontend.qnap` | x86_64 frontend build | Intel/AMD QNAP |
| `docker-compose.qnap.yml` | x86_64 deployment config | Intel/AMD QNAP |

### Shared Files (All Platforms)

| File | Purpose |
|------|---------|
| `nginx.qnap.conf` | Nginx configuration (architecture-independent) |
| `nginx.conf` | Standard Nginx config |

---

## How to Identify Your QNAP Architecture

### Check Your Model

**ARM-based QNAP models (use ARM files):**
- TS-431P3, TS-231P3
- TS-x31P series
- TS-x28A series
- Models with ARM Cortex processors

**x86_64-based QNAP models (use standard files):**
- TS-453D, TS-453E
- TS-x53D/E series
- TS-x73A series
- Models with Intel Celeron/Xeon processors

### SSH Check

```bash
# SSH into your QNAP
ssh admin@YOUR_QNAP_IP

# Check architecture
uname -m

# Output:
# armv7l  → Use ARM files
# x86_64  → Use standard files
# aarch64 → Use ARM64 files (contact support)
```

---

## Building for ARM

### Prerequisites

- ARM-based QNAP NAS (TS-431P3, etc.)
- 8GB RAM recommended (4GB minimum)
- Container Station installed
- 2-3 hours for initial build

### Build Commands

**On your QNAP (via SSH):**

```bash
cd /share/Container/student-management-system

# Build backend (20-40 minutes)
docker build \
  -f docker/Dockerfile.backend.arm32v7 \
  --build-arg VERSION=1.9.3 \
  -t sms-backend-arm32v7:latest \
  .

# Build frontend (30-60 minutes)
docker build \
  -f docker/Dockerfile.frontend.arm32v7 \
  --build-arg VITE_API_URL=/api/v1 \
  -t sms-frontend-arm32v7:latest \
  .
```

### Deploy with ARM Compose File

```bash
# Use ARM-specific compose file
docker compose -f docker/docker-compose.qnap.arm32v7.yml --env-file .env.qnap up -d

# Check status
docker compose -f docker/docker-compose.qnap.arm32v7.yml ps

# View logs
docker compose -f docker/docker-compose.qnap.arm32v7.yml logs -f
```

---

## Building for x86_64 (Standard QNAP)

**On your QNAP (via SSH):**

```bash
cd /share/Container/student-management-system

# Use standard Dockerfiles
docker build -f docker/Dockerfile.backend.qnap -t sms-backend-qnap:latest .
docker build -f docker/Dockerfile.frontend.qnap -t sms-frontend-qnap:latest .

# Deploy with standard compose file
docker compose -f docker/docker-compose.qnap.yml --env-file .env.qnap up -d
```

---

## Key Differences: ARM vs x86_64

| Aspect | ARM32v7 | x86_64 |
|--------|---------|--------|
| **Base Images** | `python:3.11-slim` (ARM) | `python:3.11-slim` (x86) |
| | `node:22-alpine` (ARM) | `node:22-alpine` (x86) |
| **Build Time** | 60-90 minutes | 5-10 minutes |
| **Performance** | 20-30% slower | Baseline |
| **Compatibility** | ARM-specific | Standard |
| **Labels** | `architecture=arm32v7` | `architecture=x86_64` |
| **Container Names** | `sms-*-qnap-arm` | `sms-*-qnap` |

---

## Image Labels

Both ARM and x86_64 images include OCI-compliant labels:

```dockerfile
org.opencontainers.image.title="SMS Backend/Frontend (ARM32v7 or x86_64)"
org.opencontainers.image.version="1.9.3"
org.opencontainers.image.arch="arm32v7" or "x86_64"
com.sms.deployment="qnap-arm" or "qnap"
com.sms.architecture="arm32v7" or "x86_64"
```

Inspect images:
```bash
docker image inspect sms-backend-arm32v7:latest | grep -A 10 Labels
```

---

## Troubleshooting

### "exec format error"

**Cause:** Using x86_64 image on ARM device (or vice versa)

**Solution:** Verify architecture and use correct Dockerfile:
```bash
uname -m  # Check your architecture
docker image inspect IMAGE_NAME | grep Architecture
```

### Build Takes Too Long

**Normal for ARM:**
- Backend: 20-40 minutes
- Frontend: 30-60 minutes
- Total: 60-90 minutes

**Speed up (optional):**
- Use cross-compilation from x86_64 workstation with Docker Buildx
- See full documentation for buildx instructions

### PostgreSQL Compatibility Issues

If `postgres:16-alpine` fails with exit code 139:

**Solution:** Use Debian-based PostgreSQL
```bash
# Edit docker-compose.qnap.arm32v7.yml
# Change:
image: postgres:16-alpine
# To:
image: postgres:16
```

---

## Version Compatibility

| SMS Version | ARM Dockerfiles | Notes |
|-------------|----------------|-------|
| **v1.9.3** | ✅ Current | ARM files track this version |
| v1.8.5 | ⚠️ Legacy | Use main Dockerfile.backend.qnap |
| v1.8.0 | ⚠️ Legacy | Use main Dockerfile.backend.qnap |

**Important:** ARM-specific files were introduced in v1.9.3 to separate ARM builds from main release builds.

---

## Documentation

**For ARM deployment:**
- [QNAP_TS-431P3_COMPATIBILITY.md](../docs/deployment/QNAP_TS-431P3_COMPATIBILITY.md) - Compatibility assessment
- [QNAP_TS-431P3_ARM_BUILD_GUIDE.md](../docs/deployment/QNAP_TS-431P3_ARM_BUILD_GUIDE.md) - Step-by-step guide

**For x86_64 deployment:**
- [QNAP.md](../docs/deployment/QNAP.md) - Quick start
- [QNAP_VIRTUAL_HOST_DEPLOYMENT_PLAN.md](../docs/deployment/QNAP_VIRTUAL_HOST_DEPLOYMENT_PLAN.md) - Production setup

**General:**
- [QNAP_DEPLOYMENT_SUMMARY.md](../docs/deployment/QNAP_DEPLOYMENT_SUMMARY.md) - Overview

---

## Contributing

### Adding ARM Support for New Architecture

If you need ARM64 (aarch64) support:

1. Create `Dockerfile.backend.arm64v8`
2. Create `Dockerfile.frontend.arm64v8`
3. Create `docker-compose.qnap.arm64v8.yml`
4. Update this README
5. Test on target hardware
6. Submit pull request

### Testing ARM Builds

Before submitting changes to ARM Dockerfiles:

```bash
# Build both images
docker build -f docker/Dockerfile.backend.arm32v7 -t test-backend .
docker build -f docker/Dockerfile.frontend.arm32v7 -t test-frontend .

# Verify architecture
docker image inspect test-backend | grep Architecture
# Should output: "Architecture": "arm"

# Test deployment
docker compose -f docker/docker-compose.qnap.arm32v7.yml up -d
docker compose -f docker/docker-compose.qnap.arm32v7.yml ps
# All containers should show "healthy"

# Cleanup
docker compose -f docker/docker-compose.qnap.arm32v7.yml down
```

---

## FAQ

### Q: Can I use the same .env.qnap file for both ARM and x86_64?

**A:** Yes! The environment configuration is architecture-independent. Use the same `.env.qnap` file for both.

### Q: Do ARM images work on x86_64 machines?

**A:** No. ARM images only run on ARM processors. Similarly, x86_64 images won't run on ARM.

### Q: Can I switch from ARM to x86_64 later?

**A:** You'd need to rebuild images for the new architecture and migrate your database. The application data is architecture-independent.

### Q: Are there pre-built ARM images on Docker Hub?

**A:** Not currently. ARM images must be built locally due to the specialized nature of ARM32v7 QNAP devices. We may add pre-built ARM images in future releases.

### Q: Will my performance be worse on ARM?

**A:** Yes, expect 20-30% slower performance compared to x86_64 Intel QNAP. However, for <25 users, this is perfectly acceptable.

---

## Support

**For ARM build issues:**
- Check [TS-431P3 Compatibility Guide](../docs/deployment/QNAP_TS-431P3_COMPATIBILITY.md)
- Check [TS-431P3 ARM Build Guide](../docs/deployment/QNAP_TS-431P3_ARM_BUILD_GUIDE.md)
- Submit GitHub issue with "ARM" label

**For general QNAP issues:**
- Check [QNAP Deployment Summary](../docs/deployment/QNAP_DEPLOYMENT_SUMMARY.md)
- QNAP Community Forum
- GitHub repository issues

---

**Last Updated:** 2025-11-27
**Maintainer:** Student Management System Team
**Version:** 1.9.3
