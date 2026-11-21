"""The cloud VM's copies of its backups to Oracle Object Storage (plan todo 55).

`infra/docker/cloud/offsite-backup/sms-offsite-backup.sh` runs on the VM from a systemd timer.
Here it runs under bash with curl replaced by a recorder that answers like Object Storage, in a
scratch folder: every new *.enc file goes up once, with a Content-MD5; nothing else goes up; a
failed upload is tried again next time and reported to the monitoring check.

Linux only (the VM's shell): CI runs it; the dev PC's Git Bash lacks the core tools.
"""

import base64
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

BASH = shutil.which("bash")
pytestmark = pytest.mark.skipif(sys.platform != "linux" or BASH is None, reason="runs under the VM's shell (Linux)")

SCRIPT = Path(__file__).resolve().parents[3] / "infra" / "docker" / "cloud" / "offsite-backup" / "sms-offsite-backup.sh"
PAR = "https://objectstorage.example.invalid/p/TOKEN/n/ns/b/sms-backups/o/"
PING = "https://hc.example.invalid/ping/abc"

FAKE_CURL = r"""#!/usr/bin/env bash
# Records each call. Answers an upload with 200 and an empty body (as Object Storage does);
# with 403 and Object Storage's body for a file named in RETAINED_NAME (the bucket holds it and
# its retention rule refuses a replacement); with FAIL_CODE (default 500) for FAIL_NAME.
log="$FAKE_LOG"
url="${@: -1}"
header=""; upload=""; out=/dev/null
while [ $# -gt 0 ]; do
  case "$1" in
    -H) header="$header|$2"; shift 2 ;;
    -T) upload="$2"; shift 2 ;;
    -o) out="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [ -n "$upload" ]; then
  echo "PUT $url $header" >> "$log"
  name="$(basename "$upload")"
  if [ -n "${RETAINED_NAME:-}" ] && [ "$name" = "$RETAINED_NAME" ]; then
    printf '{"code":"RetentionRuleViolation","message":"The operation was blocked by a retention rule."}' > "$out"
    printf 403
  elif [ -n "${FAIL_NAME:-}" ] && [ "$name" = "$FAIL_NAME" ]; then
    printf '{"code":"Refused","message":"stand-in refusal"}' > "$out"
    printf '%s' "${FAIL_CODE:-500}"
  else
    : > "$out"
    printf 200
  fi
else
  echo "PING $url" >> "$log"
fi
"""


def _setup(tmp_path, files):
    source = tmp_path / "volume" / "backups" / "database"
    source.mkdir(parents=True)
    for name, data in files.items():
        (source / name).write_bytes(data)
    (source / ".metadata").mkdir()
    (source / ".metadata" / "x.json").write_text("{}", encoding="utf-8")
    keys = tmp_path / "volume" / ".keys"
    keys.mkdir()
    (keys / "master.key").write_bytes(b"secret")
    curl = tmp_path / "curl"
    curl.write_text(FAKE_CURL, encoding="utf-8")
    curl.chmod(0o755)
    env_file = tmp_path / "offsite.env"
    env_file.write_text(f"OFFSITE_PAR_URL={PAR}\nOFFSITE_PING_URL={PING}\nOFFSITE_SOURCE={source}\n", encoding="utf-8")
    return source


def _run(tmp_path, fail_name="", fail_code="500", retained_name=""):
    env = {
        **os.environ,
        "ENV_FILE": str(tmp_path / "offsite.env"),
        "STATE_DIR": str(tmp_path / "state"),
        "CURL": str(tmp_path / "curl"),
        "FAKE_LOG": str(tmp_path / "calls.log"),
        "FAIL_NAME": fail_name,
        "FAIL_CODE": fail_code,
        "RETAINED_NAME": retained_name,
    }
    proc = subprocess.run([BASH, str(SCRIPT)], env=env, capture_output=True, text=True, timeout=60)
    log = tmp_path / "calls.log"
    calls = log.read_text(encoding="utf-8").splitlines() if log.exists() else []
    log.unlink(missing_ok=True)
    return proc, calls


def _md5(data):
    return base64.b64encode(hashlib.md5(data).digest()).decode()


def test_each_new_backup_goes_up_once_with_its_md5(tmp_path):
    a, b = b"first backup", b"second backup"
    _setup(tmp_path, {"auto_backup_1.enc": a, "auto_backup_2.enc": b})

    proc, calls = _run(tmp_path)
    assert proc.returncode == 0, proc.stderr
    puts = sorted(c for c in calls if c.startswith("PUT "))
    assert puts == [
        f"PUT {PAR}sms-cloud/auto_backup_1.enc |Content-MD5: {_md5(a)}|Content-Type: application/octet-stream",
        f"PUT {PAR}sms-cloud/auto_backup_2.enc |Content-MD5: {_md5(b)}|Content-Type: application/octet-stream",
    ]
    assert calls[-1] == f"PING {PING}"

    proc, calls = _run(tmp_path)  # the next run: nothing new
    assert proc.returncode == 0
    assert calls == [f"PING {PING}"]


def test_only_encrypted_backups_go_up(tmp_path):
    _setup(tmp_path, {"auto_backup_1.enc": b"x", "notes.txt": b"y", "student_management.db": b"z"})
    proc, calls = _run(tmp_path)
    assert proc.returncode == 0
    sent = " ".join(c for c in calls if c.startswith("PUT "))
    assert "auto_backup_1.enc" in sent
    for never in ("notes.txt", ".db", ".json", "master.key"):
        assert never not in sent


def test_a_failed_upload_is_reported_and_tried_again(tmp_path):
    _setup(tmp_path, {"auto_backup_1.enc": b"x", "auto_backup_2.enc": b"y"})
    proc, calls = _run(tmp_path, fail_name="auto_backup_2.enc")
    assert proc.returncode == 1
    assert "FAILED auto_backup_2.enc: HTTP 500" in proc.stderr
    assert calls[-1] == f"PING {PING}/fail"

    proc, calls = _run(tmp_path)  # the next run sends only the one that failed
    assert proc.returncode == 0
    assert [c.split()[1].rsplit("/", 1)[-1] for c in calls if c.startswith("PUT ")] == ["auto_backup_2.enc"]
    assert calls[-1] == f"PING {PING}"


def test_a_backup_the_bucket_already_holds_counts_as_copied(tmp_path):
    # Seen on the VM on 2026-11-21: a copied backup sent again got HTTP 403 RetentionRuleViolation.
    # Without this, a lost list (a rebuilt VM) would fail every run and keep the alarm on.
    _setup(tmp_path, {"auto_backup_1.enc": b"x", "auto_backup_2.enc": b"y"})
    proc, calls = _run(tmp_path, retained_name="auto_backup_1.enc")
    assert proc.returncode == 0, proc.stderr
    assert "already there: auto_backup_1.enc" in proc.stdout
    assert "copied auto_backup_2.enc" in proc.stdout
    assert "done: 1 copied, 1 already there, 0 failed" in proc.stdout
    assert calls[-1] == f"PING {PING}"

    proc, calls = _run(tmp_path)  # neither is sent again
    assert proc.returncode == 0
    assert calls == [f"PING {PING}"]


def test_any_other_refusal_is_a_failure(tmp_path):
    _setup(tmp_path, {"auto_backup_1.enc": b"x"})
    proc, calls = _run(tmp_path, fail_name="auto_backup_1.enc", fail_code="403")
    assert proc.returncode == 1
    assert "FAILED auto_backup_1.enc: HTTP 403" in proc.stderr
    assert "stand-in refusal" in proc.stderr  # Object Storage's message is in the log
    assert calls[-1] == f"PING {PING}/fail"


def test_no_backup_folder_is_a_failure(tmp_path):
    _setup(tmp_path, {})
    shutil.rmtree(tmp_path / "volume" / "backups")
    proc, calls = _run(tmp_path)
    assert proc.returncode == 1
    assert calls == [f"PING {PING}/fail"]
