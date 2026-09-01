# This directory is live, not legacy

Despite the `-old` suffix, this is the **only** Docker Compose stack in the
repository and is actively used by `infra/scripts/dev/DOCKER.ps1` (the
sanctioned `DOCKER.ps1 -Start` / `-Update` production entry point per
`CLAUDE.md`).

Do not delete or archive this directory as "dead code" — doing so breaks
Docker production deployments. If you want to remove the misleading name,
rename the directory and update every reference to it in
`infra/scripts/dev/DOCKER.ps1` (and any other script that resolves this
path) in the same change, then verify `DOCKER.ps1 -Start` still works.
