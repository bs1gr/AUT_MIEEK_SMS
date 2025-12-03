# Docker Versioning and Caching Strategy

> **Note ($11.9.7+)**: The scripts `RUN.ps1` and `SMART_SETUP.ps1` referenced in this document have been consolidated into `DOCKER.ps1`. Use `DOCKER.ps1 -Start`, `DOCKER.ps1 -Update`, and `DOCKER.ps1 -UpdateClean` instead. The version verification logic described here is now built into `DOCKER.ps1`.

## Overview

This document explains how SMS handles Docker image versioning, caching, and ensures that the correct image version is always running.

## The Problem We Solved

**Issue Discovered**: Container was running old image (`sms-fullstack:1.7.0`) while new image was built as `sms-fullstack:1.7.3`. The VERSION file said `1.7.0`, so `RUN.ps1` correctly started the 1.7.0 container, but the developer had built 1.7.3 expecting it to be used.

**Root Cause**: Mismatch between:
- Manual builds: `docker build -t sms-fullstack:1.7.3 ...`
- Deployment scripts: Use `$IMAGE_TAG = "sms-fullstack:${VERSION}"` where VERSION file contains `1.7.0`

## Versioning Architecture

### Version Source of Truth

**Single Source**: `VERSION` file at repository root
```text
VERSION file contains: 1.7.0
↓
All scripts read this file
↓
Image tag: sms-fullstack:1.7.0
Container name: sms-app
Volume name: sms_data
```

### Version Flow

```text
┌─────────────────────────────────────────────────────────────┐
│  VERSION file (e.g., "1.7.0")                                │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  RUN.ps1         │    │  SMART_SETUP.ps1 │
│  Reads VERSION   │    │  Reads VERSION   │
│  IMAGE_TAG =     │    │  IMAGE_TAG =     │
│  sms-fullstack:  │    │  sms-fullstack:  │
│  ${VERSION}      │    │  ${VERSION}      │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
    Docker Run              Docker Build
    Uses exact tag         Creates exact tag
```

### Image Tagging Convention

**Format**: `sms-fullstack:${VERSION}`

**Examples**:
- Production: `sms-fullstack:1.7.0`
- Development: `sms-fullstack:1.7.1-dev`
- Testing: `sms-fullstack:1.7.0-rc1`

**DO NOT**:
- Use `latest` in production (loses version tracking)
- Manually specify versions in scripts (use VERSION file)
- Mix version numbers (one tag per semantic version)

## Caching Strategy

### Docker Layer Caching

**Normal Build** (uses cache):
```powershell
docker build -t sms-fullstack:1.7.0 -f docker/Dockerfile.fullstack .
```

**Force Rebuild** (no cache):
```powershell
docker build --no-cache -t sms-fullstack:1.7.0 -f docker/Dockerfile.fullstack .
```

### When to Force Rebuild

Use `--no-cache` when:
1. Dependencies changed significantly
2. Base image updated (security patches)
3. Debugging build issues
4. After modifying Dockerfile significantly

**Commands**:
- `.\RUN.ps1 -UpdateNoCache` - Update with full rebuild
- `.\SMART_SETUP.ps1 -Force` - Setup with cache invalidation

### Cache Invalidation Triggers

Docker automatically invalidates cache when:
1. **Dockerfile changes** - Any modification to build steps
2. **Context files change** - Files being COPY'd are different
3. **Base image updated** - FROM image has new version
4. **Build args change** - Different ARG values

Docker KEEPS cache when:
1. Files not in COPY commands change (e.g., docs, tests)
2. Comments in Dockerfile change
3. Whitespace-only changes

## Version Verification

### Startup Checks (RUN.ps1)

When starting the application, RUN.ps1 now:

1. **Checks running container's image**:
```powershell
$containerImage = docker inspect sms-app --format '{{.Config.Image}}'
# Returns: sms-fullstack:1.7.0
```

2. **Compares with expected version**:
```powershell
$IMAGE_TAG = "sms-fullstack:${VERSION}"  # e.g., sms-fullstack:1.7.0
if ($containerImage -ne $IMAGE_TAG) {
    # Container running wrong version!
    # Auto-restart with correct version
}
```

3. **Auto-corrects version mismatch**:
- Stops old container
- Removes old container
- Starts new container with correct image

### Build Verification (SMART_SETUP.ps1)

After building:

```powershell
$imageCheck = docker images -q sms-fullstack:1.7.0
if ($imageCheck) {
    Write-Log "✓ Image built successfully: sms-fullstack:1.7.0"
} else {
    Write-Log "WARNING: Image build completed but tag verification failed"
}
```

## Common Scenarios

### Scenario 1: Developer Testing New Code

**Problem**: Testing changes without affecting production image.

**Solution**: Temporary version bump
```powershell
# 1. Update VERSION file temporarily
"1.7.1-dev" | Set-Content VERSION

# 2. Build with new tag
.\SMART_SETUP.ps1

# 3. Test thoroughly

# 4. Revert VERSION file or commit if ready
git checkout VERSION  # or git add VERSION && git commit
```

### Scenario 2: Production Deployment

**Problem**: Deploying new version to production.

**Steps**:
```powershell
# 1. Update VERSION file
"1.7.1" | Set-Content VERSION

# 2. Commit version bump
git add VERSION
git commit -m "chore: bump version to 1.7.1"

# 3. Build and deploy
.\RUN.ps1 -Update

# 4. Verify version
docker inspect sms-app --format '{{.Config.Image}}'
# Should show: sms-fullstack:1.7.1
```

### Scenario 3: Emergency Rebuild

**Problem**: Need to force complete rebuild due to corrupted cache.

**Solution**:
```powershell
# Option 1: Using RUN.ps1
.\RUN.ps1 -UpdateNoCache

# Option 2: Using SMART_SETUP.ps1
.\SMART_SETUP.ps1 -Force

# Option 3: Manual
docker stop sms-app
docker rm sms-app
docker rmi sms-fullstack:1.7.0
docker build --no-cache -t sms-fullstack:1.7.0 -f docker/Dockerfile.fullstack .
.\RUN.ps1
```

### Scenario 4: Testing Multiple Versions

**Problem**: Need to test different versions side-by-side.

**Solution**: Use different container names
```powershell
# Version 1.7.0 (production)
docker run -d --name sms-app-prod -p 8080:8000 sms-fullstack:1.7.0

# Version 1.7.1 (testing)
docker run -d --name sms-app-test -p 8081:8000 sms-fullstack:1.7.1

# Compare both versions
curl http://localhost:8080/health  # Production
curl http://localhost:8081/health  # Testing
```

## Troubleshooting

### Issue: "Container running old image"

**Symptom**:
```text
WARNING: Container is running old image: sms-fullstack:1.7.0 (expected: sms-fullstack:1.7.1)
```

**Cause**: VERSION file was updated but container wasn't restarted.

**Fix**: Script auto-restarts, or manually:
```powershell
.\RUN.ps1 -Stop
.\RUN.ps1
```

### Issue: "Image not found"

**Symptom**:
```text
Error response from daemon: No such image: sms-fullstack:1.7.1
```

**Cause**: Image hasn't been built yet.

**Fix**:
```powershell
.\SMART_SETUP.ps1
# or
docker build -t sms-fullstack:1.7.1 -f docker/Dockerfile.fullstack .
```

### Issue: "Build succeeds but changes not visible"

**Symptom**: Code changes don't appear in running container.

**Cause**: Docker used cached layers.

**Fix**: Force rebuild
```powershell
.\RUN.ps1 -UpdateNoCache
```

### Issue: "Multiple images with same tag"

**Symptom**:
```powershell
docker images | grep sms-fullstack
sms-fullstack    1.7.0    abc123def456    2 days ago    500MB
sms-fullstack    1.7.0    789ghi012jkl    5 minutes ago  502MB
```

**Cause**: Built new image without removing old one with same tag.

**Fix**: Clean up dangling images
```powershell
docker image prune -f
# or remove specific image by ID
docker rmi 789ghi012jkl
```

## Best Practices

### For Developers

1. **Always check VERSION file** before building
   ```powershell
   Get-Content VERSION
   ```

2. **Use scripts, not manual commands**
   - ✅ `.\RUN.ps1 -Update`
   - ❌ `docker build ... && docker run ...`

3. **Verify running version after deployment**
   ```powershell
   docker inspect sms-app --format '{{.Config.Image}}'
   ```

4. **Commit VERSION changes**
   ```powershell
   git add VERSION
   git commit -m "chore: bump version to X.Y.Z"
   ```

### For CI/CD

1. **Read version from VERSION file**
   ```yaml
   - name: Get version
     run: |
       $VERSION = Get-Content VERSION
       echo "IMAGE_TAG=sms-fullstack:$VERSION" >> $GITHUB_ENV
   ```

2. **Tag images consistently**
   ```yaml
   - name: Build
     run: docker build -t ${{ env.IMAGE_TAG }} .
   
   - name: Push
     run: docker push ${{ env.IMAGE_TAG }}
   ```

3. **Verify deployment**
   ```yaml
   - name: Verify
     run: |
       $image = docker inspect sms-app --format '{{.Config.Image}}'
       if ($image -ne $env:IMAGE_TAG) { exit 1 }
   ```

### For Production

1. **Use semantic versioning** (MAJOR.MINOR.PATCH)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

2. **Tag releases in Git**
   ```powershell
   git tag -a $11.9.7 -m "Release version 1.7.0"
   git push origin $11.9.7
   ```

3. **Keep VERSION file and Git tags in sync**
   ```powershell
   $version = Get-Content VERSION
   git tag | Select-String $version
   # Should show matching tag
   ```

4. **Document version changes** in CHANGELOG.md

## Configuration Files

### VERSION File
```text
1.7.0
```
- Plain text, single line
- Semantic version format
- No prefix (no 'v')
- No trailing newlines/spaces (use `.Trim()` when reading)

### .env File (Root)
```text
VERSION=1.7.0
```
- Auto-synced by SMART_SETUP.ps1
- Used by docker-compose.yml
- Should match VERSION file

### docker-compose.yml
```yaml
services:
  backend:
    image: sms-backend:${VERSION:-latest}
  frontend:
    image: sms-frontend:${VERSION:-latest}
```
- Uses VERSION from .env
- Falls back to `latest` if not set

## Related Files

- `VERSION` - Single source of truth for version number
- `RUN.ps1` - Production deployment script with version verification
- `SMART_SETUP.ps1` - Build script with version tagging
- `docker-compose.yml` - Multi-container orchestration
- `.env` - Environment variables (includes VERSION)
- `CHANGELOG.md` - Version history and changes

## Future Improvements

Potential enhancements:
1. **Automatic version bumping** via script
2. **Git pre-commit hook** to validate VERSION format
3. **CI/CD version validation** in pipeline
4. **Image signing** for security
5. **Multi-architecture builds** (amd64, arm64)
6. **Image scanning** for vulnerabilities

## Summary

**Key Takeaways**:
- ✅ VERSION file is single source of truth
- ✅ All scripts read VERSION file for consistency
- ✅ RUN.ps1 auto-detects and corrects version mismatches
- ✅ Use `--no-cache` when Docker caching causes issues
- ✅ Always verify running container image tag matches VERSION file
- ✅ Commit VERSION changes to Git for traceability

**Golden Rule**: If you change VERSION file, rebuild and restart!

