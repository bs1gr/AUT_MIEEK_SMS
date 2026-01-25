# Deploying the Student Management System (images)

This document shows how to pull the prebuilt Docker images from Docker Hub or GHCR and run them locally or in production. It includes tag- and digest-based commands for reproducible deployments.

## Images ($11.9.7)

- Docker Hub
  - vasileiossamaras/aut_mieek_sms-frontend:1.3.5
  - vasileiossamaras/aut_mieek_sms-backend:1.3.5
  - vasileiossamaras/aut_mieek_sms-fullstack:1.3.5

- GHCR
  - ghcr.io/bs1gr/sms-frontend:1.3.5
  - ghcr.io/bs1gr/sms-backend:1.3.5
  - ghcr.io/bs1gr/sms-fullstack:1.3.5

## Pulling images

Pull by tag (Docker Hub):

```powershell
docker pull vasileiossamaras/aut_mieek_sms-frontend:1.3.5
docker pull vasileiossamaras/aut_mieek_sms-backend:1.3.5
docker pull vasileiossamaras/aut_mieek_sms-fullstack:1.3.5

```text
Pull by tag (GHCR):

```powershell
docker pull ghcr.io/bs1gr/sms-frontend:1.3.5
docker pull ghcr.io/bs1gr/sms-backend:1.3.5
docker pull ghcr.io/bs1gr/sms-fullstack:1.3.5

```text
Pull by digest (immutable):

```powershell
# Replace DIGEST with the value from the Release

docker pull vasileiossamaras/aut_mieek_sms-fullstack@sha256:<DIGEST>

```text
## Run locally (fullstack)

The fullstack image bundles backend + nginx frontend; run it with:

```powershell
docker run -p 80:80 vasileiossamaras/aut_mieek_sms-fullstack:1.3.5

```text
Then browse <http://localhost>.

### Database in Docker

When running in Docker the application commonly expects the SQLite database to be mounted at `/data/student_management.db`.

- Set the `DATABASE_URL` environment variable to point at the mounted path. Example:

```powershell
docker run -p 80:80 \
  -e DATABASE_URL="sqlite:////data/student_management.db" \
  -v C:/sms/data:/data \
  vasileiossamaras/aut_mieek_sms-fullstack:1.3.5

```text
Notes:

- The app validates database paths and will accept files inside the project by default or under `/data` when running in Docker. If you need to place the DB elsewhere, set the environment variable `ALLOW_EXTERNAL_DB_PATH=1` inside the container to explicitly opt-in.
- On Windows the host path for the volume (`C:/sms/data` above) should be replaced with your local path.

Kubernetes example (mount a PersistentVolume at `/data` and set env):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sms-fullstack
spec:
  template:
    spec:
      containers:
        - name: sms-fullstack

          image: ghcr.io/bs1gr/sms-fullstack:1.3.5
          env:
            - name: DATABASE_URL

              value: "sqlite:////data/student_management.db"
          volumeMounts:
            - name: data

              mountPath: /data
      volumes:
        - name: data

          persistentVolumeClaim:
            claimName: sms-data-pvc

```text
This allows the container to use `/data` for the SQLite file while keeping the project filesystem separate.

## CI / Secrets and workflow

When running migrations or tests in CI, provide the following secrets in your repository settings:

- `DATABASE_URL` — the full SQLAlchemy connection string used by the application (for example: `sqlite:////data/student_management.db` for Docker-mounted SQLite, or a proper RDB connection string for managed DBs).
- (Optional) `ALLOW_EXTERNAL_DB_PATH` — set to `1` in ephemeral test runners only when the DB path is outside the repository root and you explicitly accept the security tradeoff.

A GitHub Actions workflow has been added at `.github/workflows/run-migrations.yml` that:

- runs the programmatic migration runner `python -m backend.run_migrations -v` using the `DATABASE_URL` secret
- runs the backend test suite (`pytest`) and uploads migration/test logs as artifacts

To enable the workflow for production migrations, add `DATABASE_URL` as a repository secret that points to your production database and trigger the workflow via the Actions UI or wire it into your deployment pipeline. Be cautious: running migrations against production DB requires appropriate backups and maintenance windows.

## Run with separate services (backend + frontend)

Run backend:

```powershell
docker run -p 8000:8000 vasileiossamaras/aut_mieek_sms-backend:1.3.5

```text
Run frontend (nginx):

```powershell
docker run -p 8080:80 vasileiossamaras/aut_mieek_sms-frontend:1.3.5

```text
Frontend will try to proxy /api to the backend at the default internal host; for local testing you may need to configure the frontend to point to your backend host.

## Kubernetes / Production

For production, prefer pinning images by digest in manifests:

```yaml
image: ghcr.io/bs1gr/sms-fullstack@sha256:3cf0c3f5c9d6ecec...

```text
This avoids surprises from retagging `latest`.

## Troubleshooting

- If pull is denied: ensure you are authenticated and have permission for the repo.
- If you see mismatched digests between Docker Hub and GHCR, each registry stores its own manifest digests; pick the registry you will deploy from and use its digest.
