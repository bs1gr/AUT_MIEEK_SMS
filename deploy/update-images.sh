#!/usr/bin/env bash
# Helper: read RELEASE_NOTES/docker-images-<version>.md and apply kubectl set image
# Usage: ./deploy/update-images.sh 1.3.5 production
set -euo pipefail
VERSION=${1:-}
NS=${2:-production}
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [namespace]"
  exit 2
fi
FILE="RELEASE_NOTES/README.md"  # consolidated pointer to CHANGELOG.md
if [ ! -f "$FILE" ]; then
  echo "Release notes file not found: $FILE"
  exit 1
fi
# Try to find dockerhub digests first, fall back to ghcr digests
BACKEND=$(grep -Eo 'aut_mieek_sms-backend@sha256:[a-f0-9]+' "$FILE" | head -n1)
FRONTEND=$(grep -Eo 'aut_mieek_sms-frontend@sha256:[a-f0-9]+' "$FILE" | head -n1)
FULLSTACK=$(grep -Eo 'aut_mieek_sms-fullstack@sha256:[a-f0-9]+' "$FILE" | head -n1)
if [ -z "$BACKEND" ]; then BACKEND=$(grep -Eo 'ghcr.io/bs1gr/sms-backend@sha256:[a-f0-9]+' "$FILE" | head -n1); fi
if [ -z "$FRONTEND" ]; then FRONTEND=$(grep -Eo 'ghcr.io/bs1gr/sms-frontend@sha256:[a-f0-9]+' "$FILE" | head -n1); fi
if [ -z "$FULLSTACK" ]; then FULLSTACK=$(grep -Eo 'ghcr.io/bs1gr/sms-fullstack@sha256:[a-f0-9]+' "$FILE" | head -n1); fi
if [ -n "$BACKEND" ]; then
  echo "Updating backend to $BACKEND"
  kubectl set image deployment/sms-backend sms-backend="$BACKEND" -n "$NS" --record
  kubectl rollout status deployment/sms-backend -n "$NS"
fi
if [ -n "$FRONTEND" ]; then
  echo "Updating frontend to $FRONTEND"
  kubectl set image deployment/sms-frontend sms-frontend="$FRONTEND" -n "$NS" --record
  kubectl rollout status deployment/sms-frontend -n "$NS"
fi
if [ -n "$FULLSTACK" ]; then
  echo "Updating fullstack to $FULLSTACK"
  kubectl set image deployment/sms-fullstack sms-fullstack="$FULLSTACK" -n "$NS" --record
  kubectl rollout status deployment/sms-fullstack -n "$NS"
fi

echo "Deploy completed"
