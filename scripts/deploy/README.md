# Deployment Helper Scripts

Small helpers used around Docker deployment. **They are not how you start the system** — the
two supported entry points live in `infra/scripts/dev/` (see `CLAUDE.md`):

| Mode | Command | Port | Use for |
|------|---------|------|---------|
| Docker | `.\infra\scripts\dev\DOCKER.ps1 -Start` | 8080 | Production |
| Native | `.\infra\scripts\dev\NATIVE.ps1 -Start` | 8000 + 5173 | Development and testing |

Stop Docker with `.\infra\scripts\dev\DOCKER.ps1 -Stop`.

## What is in this folder

- `set-docker-metadata.ps1` — reads `VERSION` and sets the environment variables
  docker-compose uses for versioned image builds.
- `internal/CREATE_DEPLOYMENT_PACKAGE.ps1` — builds a self-contained package for installing on
  a Windows computer without internet access (application source, plus the Docker image when
  one is available).

## Related scripts elsewhere

- `scripts/CHECK_VOLUME_VERSION.ps1` — checks the Docker data volume (`sms_data`, overridable
  with `SMS_DATA_VOLUME`) against the current schema version and suggests migration if they
  differ; `-AutoMigrate` runs it.
- `scripts/linux_env_check.sh` — validates a Linux host for running the system
  (`--fix` applies safe fixes).
- The Windows installer is built by `infra/scripts/release/INSTALLER_BUILDER.ps1`.

## Linux

`DOCKER.ps1` is a PowerShell script, so on Linux it needs PowerShell 7 (`pwsh`). There is no
supported plain-`docker compose` equivalent: `DOCKER.ps1` runs a single-image `sms-fullstack`
container, supplies secrets through `--env-file`, and handles the database container and
volume migrations. Running `docker compose -f infra/docker/compose/docker-compose.yml` on its
own fails immediately, because `SECRET_KEY` is required and nothing has provided it.

## History

This README previously documented `DOCKER_UP.ps1`, `DOCKER_DOWN.ps1`, `CREATE_PACKAGE.ps1`,
`INSTALLER.ps1` and `SMART_SETUP.ps1`, none of which exist any more, and pre-flatten paths for
`DOCKER.ps1`, `NATIVE.ps1` and the Compose file. `run-docker-release.ps1` and
`run-docker-release.sh` were removed on 2026-09-17: both only launched the missing
`SMART_SETUP.ps1`, so they always failed with "not found". The old README's Linux fallback,
`docker compose -f docker/docker-compose.yml up -d --build`, was wrong twice over — the
path is pre-flatten, and the command fails without `SECRET_KEY` even at the right path.
