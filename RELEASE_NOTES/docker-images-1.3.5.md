# Docker images published for v1.3.5

This file documents the images that were pushed to Docker Hub and GHCR for version 1.3.5 and provides exact pull commands (by tag and by digest) for reproducible deployments.

Repository: vasileiossamaras
Date: 2025-11-02

## Summary

- frontend: `vasileiossamaras/aut_mieek_sms-frontend:1.3.5`
  - last_updated: 2025-11-02T09:18:04.68818Z
  - digests:
    - sha256:e03c6b4d89f4a4c29bddbf7f83da8f8aa6b467a0aaa3a732c682b4997f83c7d2
    - sha256:fd8b49212080bac2ae7ec4053a23322e380f4ba227ec7a350190e0ed446823b6
  - sizes (bytes): 22777374, 1349

- backend: `vasileiossamaras/aut_mieek_sms-backend:1.3.5`
  - last_updated: 2025-11-02T09:19:41.964419Z
  - digests:
    - sha256:aa92271e240ee922ee07791eb04c89f340ae7467f2384f7a17b46bc584cef68e
    - sha256:c2806f8b1be080cf41a7c92ae52008f31af8039286b99749e334cf4a0e4f496b
  - sizes (bytes): 241101450, 1206

- fullstack: `vasileiossamaras/aut_mieek_sms-fullstack:1.3.5`
  - last_updated: 2025-11-02T09:19:06.295944Z
  - digests:
    - sha256:3cf0c3f5c9d6ecec1c1d67741c91c58cf57662bb56a089df315d8a8a47a09e37
    - sha256:3105be2e4b24b96cd6c084f4fbd41e53820a22b9517af0a1175d1718fbfc724b
  - sizes (bytes): 135487857, 1355

## Recommended pull commands

Pull by tag (convenient):

```powershell
docker pull vasileiossamaras/aut_mieek_sms-frontend:1.3.5
docker pull vasileiossamaras/aut_mieek_sms-backend:1.3.5
docker pull vasileiossamaras/aut_mieek_sms-fullstack:1.3.5
```

Pull by digest (immutable):

```powershell
docker pull vasileiossamaras/aut_mieek_sms-frontend@sha256:e03c6b4d89f4a4c29bddbf7f83da8f8aa6b467a0aaa3a732c682b4997f83c7d2
docker pull vasileiossamaras/aut_mieek_sms-backend@sha256:aa92271e240ee922ee07791eb04c89f340ae7467f2384f7a17b46bc584cef68e
docker pull vasileiossamaras/aut_mieek_sms-fullstack@sha256:3cf0c3f5c9d6ecec1c1d67741c91c58cf57662bb56a089df315d8a8a47a09e37
```

## GHCR (GitHub Container Registry)

Images are also pushed to GHCR by CI. Use GHCR if you prefer GitHub hosting (no Docker Hub private-repo limits for many accounts).

Pull by tag (GHCR):

```powershell
docker pull ghcr.io/bs1gr/sms-frontend:1.3.5
docker pull ghcr.io/bs1gr/sms-backend:1.3.5
docker pull ghcr.io/bs1gr/sms-fullstack:1.3.5
```

Pull by digest (GHCR immutable):

```powershell
docker pull ghcr.io/bs1gr/sms-frontend@sha256:e03c6b4d89f4a4c29bddbf7f83da8f8aa6b467a0aaa3a732c682b4997f83c7d2
docker pull ghcr.io/bs1gr/sms-backend@sha256:aa92271e240ee922ee07791eb04c89f340ae7467f2384f7a17b46bc584cef68e
docker pull ghcr.io/bs1gr/sms-fullstack@sha256:3cf0c3f5c9d6ecec1c1d67741c91c58cf57662bb56a089df315d8a8a47a09e37
```

## Verify remotely (Docker Hub / GHCR API)

You can query the Docker Hub tags endpoint to verify tags programmatically (public repos):

```powershell
Invoke-RestMethod -Uri "https://hub.docker.com/v2/repositories/vasileiossamaras/aut_mieek_sms-fullstack/tags?page_size=100" | ConvertTo-Json -Depth 4
```

To check GHCR manifest digests:

```bash
curl -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  -u <GITHUB_USERNAME>:<GITHUB_PAT> \
  "https://ghcr.io/v2/bs1gr/sms-fullstack/manifests/1.3.5" | grep Docker-Content-Digest
```

## Notes & next steps

- The CI will create a release draft containing these notes and the CI-collected image digests. Review the draft and publish when ready.
- If you want the release auto-published, change the workflow `draft: true` to `draft: false`.
- I can also add a `docs/DEPLOY.md` with step-by-step deploy instructions (compose examples, k8s manifests). Let me know.
