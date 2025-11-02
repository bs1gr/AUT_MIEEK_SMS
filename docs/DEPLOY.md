# Deploying the Student Management System (images)

This document shows how to pull the prebuilt Docker images from Docker Hub or GHCR and run them locally or in production. It includes tag- and digest-based commands for reproducible deployments.

## Images (v1.3.5)

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
```

Pull by tag (GHCR):

```powershell
docker pull ghcr.io/bs1gr/sms-frontend:1.3.5
docker pull ghcr.io/bs1gr/sms-backend:1.3.5
docker pull ghcr.io/bs1gr/sms-fullstack:1.3.5
```

Pull by digest (immutable):

```powershell
# Replace DIGEST with the value from the Release
docker pull vasileiossamaras/aut_mieek_sms-fullstack@sha256:<DIGEST>
```

## Run locally (fullstack)

The fullstack image bundles backend + nginx frontend; run it with:

```powershell
docker run -p 80:80 vasileiossamaras/aut_mieek_sms-fullstack:1.3.5
```

Then browse <http://localhost>.

## Run with separate services (backend + frontend)

Run backend:

```powershell
docker run -p 8000:8000 vasileiossamaras/aut_mieek_sms-backend:1.3.5
```

Run frontend (nginx):

```powershell
docker run -p 8080:80 vasileiossamaras/aut_mieek_sms-frontend:1.3.5
```

Frontend will try to proxy /api to the backend at the default internal host; for local testing you may need to configure the frontend to point to your backend host.

## Kubernetes / Production

For production, prefer pinning images by digest in manifests:

```yaml
image: ghcr.io/bs1gr/sms-fullstack@sha256:3cf0c3f5c9d6ecec...
```

This avoids surprises from retagging `latest`.

## Troubleshooting

- If pull is denied: ensure you are authenticated and have permission for the repo.
- If you see mismatched digests between Docker Hub and GHCR, each registry stores its own manifest digests; pick the registry you will deploy from and use its digest.
