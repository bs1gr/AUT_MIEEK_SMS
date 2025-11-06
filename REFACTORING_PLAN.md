# Operational Architecture Refactoring Plan

## Current Problems

### 1. Massive Duplication
- SMS.ps1 (1473 lines) duplicates control API functionality
- Same operations in 3 places: PowerShell + Backend API + Frontend
- Example: Database backup in both SMS.ps1 and routers_control.py

### 2. Unclear Responsibilities
- SMS.ps1: Both Docker AND native operations mixed together
- SMART_SETUP.ps1: Claims Docker-only but has native code paths
- Backend API: Has endpoints that can't work in Docker mode

### 3. Docker Mode Issues
- 10+ API endpoints don't make sense in Docker (start, restart, uninstall, etc.)
- Frontend was calling native operations from inside container
- No clear guards/warnings for Docker-incompatible operations

### 4. Obsolete Files
- `install.py` - Alternative Python installer
- `INSTALL.bat` - Wrapper for install.py
- `UNINSTALL.bat` - Uninstall script
- Purpose unclear when we have SMART_SETUP.ps1 + SMS.ps1

### 5. Mixed Paradigms
- v1.3.8 claims "Docker-only" but has full native support
- SMART_SETUP.ps1 says Docker-only but SMS.ps1 supports both modes
- Confusing for users and maintenance

---

## Refactoring Goals

🎯 **Single source of truth** - No duplication  
🎯 **Clear responsibilities** - Each component has one job  
🎯 **Docker-first** - v1.3.8 is Docker-only release  
🎯 **Clean separation** - Host layer ≠ Container layer  

---

## Clean Architecture Design

### HOST LAYER (PowerShell - Runs on Windows Host)

#### 📦 SMART_SETUP.ps1 - First-Time Setup ONLY
**Responsibility:** Prepare environment and start application for the first time

**Keep:**
- Check Docker availability (fail if not installed)
- Create .env files from templates
- Build Docker images (`docker compose build`)
- Start containers (`docker compose up -d`)
- Show access URLs
- Log to setup.log

**Remove:**
- ❌ Backend/Frontend dependency installation (Docker handles this via Dockerfile)
- ❌ Database initialization (backend entrypoint.py handles this automatically)
- ❌ Python/Node checks (not needed for Docker mode)

**Size Target:** ~150 lines (from 248 lines)

---

#### 🎮 SMS.ps1 - Runtime Management ONLY
**Responsibility:** Docker container lifecycle management from host

**Keep:**
- `Start-Application` → `docker compose up -d`
- `Stop-Application` → `docker compose down`
- `Restart-Application` → `docker compose restart` or `down` + `up`
- `Show-SystemStatus` → `docker ps`, container health checks
- `Show-Logs` → `docker logs <container>`
- `Open-InBrowser` → Open URLs (http://localhost:8080)
- Command-line parameters: `-Quick`, `-Status`, `-Stop`, `-Restart`, `-Help`

**Remove:**
- ❌ Interactive menu (20+ options) → Use Control Panel in web app
- ❌ Diagnostics functions → Use Control Panel `/diagnostics` API
- ❌ Database backup/restore → Use Control Panel `/operations/database-*` API
- ❌ Port debugging → Use Control Panel `/ports` API
- ❌ Environment checks → Use Control Panel `/environment` API
- ❌ Cleanup operations → Handled by Docker (container rebuilds)
- ❌ Docker build operations → Part of setup, not runtime
- ❌ Native mode support → Docker-only in v1.3.8

**Size Target:** ~300 lines (from 1473 lines - 80% reduction!)

---

#### 🗑️ DELETE OBSOLETE FILES
- `install.py` - Python installer (obsolete, use SMART_SETUP.ps1)
- `INSTALL.bat` - Wrapper for install.py (obsolete)
- `UNINSTALL.bat` - Uninstall script (Docker cleanup via `docker compose down -v`)

---

### CONTAINER LAYER (Backend API - Runs Inside Docker)

#### 🔧 backend/routers/routers_control.py
**Responsibility:** Application operations accessible from web UI

#### ✅ KEEP (Docker-Safe Endpoints)

**GET Endpoints:**
- `/status` - System status (backend/frontend/docker/database)
- `/diagnostics` - Comprehensive health checks
- `/ports` - Port monitoring
- `/environment` - Environment info (Python version, app version, mode)
- `/logs/backend` - Backend log viewing
- `/operations/database-backups` - List available backups
- `/troubleshoot` - Troubleshooting diagnostics

**POST Endpoints:**
- `/operations/database-backup` - Backup database (works in Docker)
- `/operations/database-restore` - Restore database from backup
- `/operations/exit-all` - Stop backend gracefully (Docker-aware warning)

**Estimated Size:** ~800 lines (from 1500+ lines)

---

#### ❌ REMOVE (Docker-Incompatible Endpoints)

These operations cannot work from inside a Docker container:

1. **POST /operations/start**
   - Why: Can't start Docker containers from inside a container
   - Use Instead: `.\SMS.ps1 -Quick` on host

2. **POST /operations/restart**
   - Why: Can't restart own container (loses socket connection)
   - Use Instead: `.\SMS.ps1 -Restart` on host

3. **POST /operations/uninstall**
   - Why: Can't uninstall/remove containers from inside
   - Use Instead: `docker compose down -v` on host

4. **POST /operations/install-frontend-deps**
   - Why: Dependencies installed via `frontend/Dockerfile` at build time
   - Use Instead: Rebuild image with `docker compose build`

5. **POST /operations/install-backend-deps**
   - Why: Dependencies installed via `backend/Dockerfile` at build time
   - Use Instead: Rebuild image with `docker compose build`

6. **POST /operations/docker-build**
   - Why: Docker-in-Docker issues, should be done on host
   - Use Instead: `docker compose build` on host

7. **POST /operations/docker-stop**
   - Why: Can't stop containers from inside
   - Use Instead: `.\SMS.ps1 -Stop` on host

8. **POST /operations/docker-prune**
   - Why: Docker-in-Docker, dangerous from inside container
   - Use Instead: `docker system prune` on host

9. **POST /operations/cleanup**
   - Why: File system operations on host filesystem
   - Use Instead: Not needed in Docker (clean containers)

10. **POST /operations/cleanup-obsolete**
    - Why: File system operations on host filesystem
    - Use Instead: Not needed in Docker (immutable images)

11. **POST /operations/docker-update-volume**
    - Why: Can't modify docker-compose.yml from inside container
    - Use Instead: Manual volume management on host

---

### UI LAYER (React - Runs in Browser)

#### 🎨 frontend/src/components/ControlPanel.jsx
**Status:** ✅ Already refactored (mode-aware UI implemented)

**Current State:**
- Mode indicator banner shows Docker mode
- Native Operations card hidden in Docker mode
- Docker Operations card hidden in Docker mode
- Only calls Docker-safe APIs

**Additional Improvements:**
- Add helpful messages: "To restart: use `.\SMS.ps1 -Restart` on host"
- Link to documentation for host operations
- Show clearer instructions for Docker-only users

---

## Implementation Phases

### Phase 1: Backend API Cleanup ⏳
**Priority:** HIGH  
**Impact:** Removes 700+ lines of unusable code

**Tasks:**
1. Remove 11 Docker-incompatible endpoints from `routers_control.py`
2. Update error codes in `backend/errors.py`
3. Test remaining endpoints in Docker mode
4. Update API documentation

**Estimated Time:** 2 hours

---

### Phase 2: PowerShell Scripts Refactoring ⏳
**Priority:** HIGH  
**Impact:** Removes 1200+ lines of duplicate code

**Tasks:**
1. Simplify `SMS.ps1`:
   - Remove interactive menu
   - Remove duplicate diagnostic functions
   - Keep only Docker control commands
   - Target: 300 lines (from 1473)

2. Simplify `SMART_SETUP.ps1`:
   - Remove dependency installation logic
   - Remove database init logic (entrypoint.py handles it)
   - Focus on Docker-only setup
   - Target: 150 lines (from 248)

3. Delete obsolete files:
   - `install.py`
   - `INSTALL.bat`
   - `UNINSTALL.bat`

**Estimated Time:** 3 hours

---

### Phase 3: Frontend Updates ⏳
**Priority:** MEDIUM  
**Impact:** Better user guidance

**Tasks:**
1. Update `ControlPanel.jsx`:
   - Add instructional messages for removed operations
   - Show PowerShell commands users should run on host
   - Link to documentation

2. Update translations:
   - Add messages for Docker-only mode
   - Explain host vs container operations

**Estimated Time:** 1 hour

---

### Phase 4: Documentation Updates ⏳
**Priority:** MEDIUM  
**Impact:** Clear user guidance

**Tasks:**
1. Update `README.md`:
   - Docker-only deployment instructions
   - Remove native mode references

2. Update `QUICK_START_GUIDE.md`:
   - Simplified steps for Docker-only

3. Update `docs/ARCHITECTURE.md`:
   - New operational architecture
   - Clear layer responsibilities

4. Create `docs/DOCKER_OPERATIONS.md`:
   - Host operations (SMS.ps1)
   - Container operations (Control Panel)
   - What works where

**Estimated Time:** 2 hours

---

### Phase 5: Testing ⏳
**Priority:** HIGH  
**Impact:** Ensure nothing breaks

**Tasks:**
1. Test SMART_SETUP.ps1 on fresh machine
2. Test SMS.ps1 start/stop/restart/status
3. Test Control Panel in Docker mode
4. Test database backup/restore
5. Verify diagnostics/logs work
6. Test on Windows 10/11

**Estimated Time:** 2 hours

---

## Success Metrics

### Code Reduction
- ❌ routers_control.py: 1500 → 800 lines (-700 lines, -47%)
- ❌ SMS.ps1: 1473 → 300 lines (-1173 lines, -80%)
- ❌ SMART_SETUP.ps1: 248 → 150 lines (-98 lines, -40%)
- ❌ Delete: install.py, INSTALL.bat, UNINSTALL.bat (~300 lines)
- **Total Reduction:** ~2,270 lines removed (**-60% codebase**)

### Architectural Clarity
- ✅ Single source of truth for each operation
- ✅ Clear host vs container separation
- ✅ Docker-first design (no native mode confusion)
- ✅ No duplicate functionality

### User Experience
- ✅ Simple setup: `.\SMART_SETUP.ps1`
- ✅ Simple control: `.\SMS.ps1 -Quick`, `.\SMS.ps1 -Stop`, `.\SMS.ps1 -Status`
- ✅ Rich UI: Control Panel in web app
- ✅ Clear instructions: "Use SMS.ps1 on host for X"

---

## Risks & Mitigation

### Risk 1: Breaking Existing Workflows
**Mitigation:** 
- Keep SMS.ps1 CLI parameters working (`-Quick`, `-Stop`, `-Status`)
- Add deprecation warnings for removed operations
- Update all documentation with new workflows

### Risk 2: Users Expect Full Native Mode Support
**Mitigation:**
- v1.3.8 is explicitly Docker-only release
- Add clear notices in setup scripts
- Provide migration guide from native to Docker

### Risk 3: Backend API Breaking Changes
**Mitigation:**
- Mark removed endpoints as deprecated first (return 410 Gone)
- Add notices in response: "This operation is not supported in Docker mode"
- Version API properly (already at /api/v1)

---

## Next Steps

1. **Get Approval** ✅ Waiting for user confirmation
2. **Phase 1** - Backend API cleanup (2h)
3. **Phase 2** - PowerShell refactoring (3h)
4. **Phase 3** - Frontend updates (1h)
5. **Phase 4** - Documentation (2h)
6. **Phase 5** - Testing (2h)
7. **Deploy** - Release as v1.3.9 with clean architecture

**Total Estimated Time:** 10 hours  
**Total Code Reduction:** 2,270 lines (-60%)  
**Result:** Clean, maintainable, Docker-first architecture
