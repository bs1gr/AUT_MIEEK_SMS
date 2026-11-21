#!/usr/bin/env bash
# Copies the cloud VM's encrypted database backups to Oracle Object Storage (plan todo 55).
#
# Runs as root from sms-offsite-backup.timer, every 6 hours. Each *.enc file of the backup
# folder that was not copied before is sent once, with a Content-MD5 header that Object Storage
# checks. The backups are encrypted with the VM's key, which is never copied: a copy is only of
# use with the key the owner keeps elsewhere.
#
# Settings, in /etc/sms-offsite-backup.env (root only, chmod 600; never in the repository):
#   OFFSITE_PAR_URL   the bucket's write-only pre-authenticated request URL (ends in /o/)
#   OFFSITE_PING_URL  a healthchecks.io check: pinged after a run without failures, and its
#                     /fail address after a run with one (optional)
#   OFFSITE_SOURCE    the backup folder (default: the cloud container's volume)
#   OFFSITE_PREFIX    the object name prefix (default: sms-cloud/)
set -uo pipefail

ENV_FILE=${ENV_FILE:-/etc/sms-offsite-backup.env}
STATE_DIR=${STATE_DIR:-/var/lib/sms-offsite-backup}
CURL=${CURL:-curl}
# shellcheck disable=SC1090
[ -r "$ENV_FILE" ] && . "$ENV_FILE"
: "${OFFSITE_PAR_URL:?OFFSITE_PAR_URL is not set (see $ENV_FILE)}"
SOURCE=${OFFSITE_SOURCE:-/var/lib/docker/volumes/cloud_sms_cloud_data/_data/backups/database}
PREFIX=${OFFSITE_PREFIX:-sms-cloud/}

mkdir -p "$STATE_DIR"
touch "$STATE_DIR/uploaded.txt"
exec 9>"$STATE_DIR/lock"
flock -n 9 || { echo "another run is active"; exit 0; }

ping() {
    [ -n "${OFFSITE_PING_URL:-}" ] || return 0
    "$CURL" -fsS -m 10 --retry 3 -o /dev/null "${OFFSITE_PING_URL}$1" || echo "the ping failed" >&2
}

if [ ! -d "$SOURCE" ]; then
    echo "FAILED: no backup folder at $SOURCE" >&2
    ping /fail
    exit 1
fi

sent=0
present=0
failed=0
response="$STATE_DIR/response.txt"
shopt -s nullglob
for file in "$SOURCE"/*.enc; do
    name=$(basename "$file")
    grep -qxF "$name" "$STATE_DIR/uploaded.txt" && continue
    md5=$(openssl dgst -md5 -binary "$file" | base64)
    : >"$response"
    code=$("$CURL" -sS -o "$response" -w '%{http_code}' --max-time 300 -X PUT \
        -H "Content-MD5: $md5" -H 'Content-Type: application/octet-stream' \
        -T "$file" "${OFFSITE_PAR_URL}${PREFIX}${name}")
    if [ "$code" = "200" ]; then
        echo "$name" >>"$STATE_DIR/uploaded.txt"
        sent=$((sent + 1))
        echo "copied $name"
    elif [ "$code" = "403" ] && grep -q '"RetentionRuleViolation"' "$response"; then
        # The bucket already holds this name and its retention rule keeps it from being
        # replaced: an earlier upload arrived (the list was lost, or curl timed out after it).
        echo "$name" >>"$STATE_DIR/uploaded.txt"
        present=$((present + 1))
        echo "already there: $name"
    else
        failed=$((failed + 1))
        echo "FAILED $name: HTTP $code $(head -c 300 "$response")" >&2
    fi
done
rm -f "$response"

echo "done: $sent copied, $present already there, $failed failed"
if [ "$failed" -gt 0 ]; then
    ping /fail
    exit 1
fi
ping ""
