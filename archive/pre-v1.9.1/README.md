# Pre-v1.9.1 Archive

**Archived:** 2025-11-26
**Last Updated:** 2025-11-26
**Reason:** Legacy content superseded by v1.9.x consolidated architecture

This directory contains all deprecated artifacts from versions prior to v1.9.1.

## Key Documents

- **`CHANGELOG_ARCHIVE.md`** - Summarized historical changelog entries (v1.1.0 - v1.8.7)

## Contents

### Release Notes (Pre-1.9.1)

- `releases/v1.6.2.md`, `v1.6.3.md`, `v1.6.5.md` - Early v1.6.x releases
- `releases/v1.8.6.4.md`, `v1.8.7.md`, `v1.8.8.md` - v1.8.x releases
- `releases/github_release_body_v1.8.6.4.md` - GitHub release template

### Session Documentation

- `sessions_2025-11/` - Development session logs (November 2025)
- `session_docs_2025-11-22/` - Auth fix session documentation

### Deprecated Scripts & Components

- `deprecated/` - Scripts replaced by DOCKER.ps1/NATIVE.ps1 consolidation
- `deprecated_bat_wrappers/` - Legacy .bat files replaced by PowerShell
- `scripts/` - One-time migration scripts (reorganize, consolidate)
- `deprecated_stubs/` - Stub scripts that displayed deprecation messages
- `scripts_docker_duplicate/` - Duplicate of scripts/deploy/docker
- `scripts_internal_duplicate/` - Duplicate of scripts/dev/internal
- `ARCHIVE_DEPRECATED_SCRIPTS.ps1` - One-time archival utility script

### Documentation

- `V2_QUICK_REFERENCE.md` - Old v2.0 roadmap document (pre-completion)
- `installer/` - Old installer docs referencing RUN.ps1, INSTALL.ps1, SMS.ps1

### Consolidation Guides

- `SCRIPTS_CONSOLIDATION_GUIDE.md` - Migration guide from legacy scripts
- `scripts-consolidation-guide.md` - Duplicate from docs/operations

### Miscellaneous

- Various fix summaries, session logs, and diagnostic documents

## Note

These files are preserved for historical reference only. The current codebase (v1.9.3+) uses:

- **`DOCKER.ps1`** - All Docker deployment operations
- **`NATIVE.ps1`** - All native development operations
- Port **8080** (standard)
- Consolidated documentation structure

Do not reference these files for current development guidance.
