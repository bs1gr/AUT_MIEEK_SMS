"""Maintenance and configuration management endpoints for Control Panel.

Provides admin interface for managing application settings, particularly
authentication and authorization policies.
"""

from __future__ import annotations

import json
import hashlib
import logging
import os
import re
import threading
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Literal, Optional, cast
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from backend.control_auth import require_control_admin
from backend.security.path_validation import validate_filename

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_native_windows() -> bool:
    """Check if running natively on Windows (safe to mock without corrupting os.name)."""
    return os.name == "nt"


# lite: SMS Lite (sets SMS_DEPLOYMENT_MODE=lite at start). docker: the Docker edition.
# native: a developer's checkout (NATIVE.ps1) - never updated by running the installer.
DeploymentMode = Literal["docker", "native", "lite"]


def _deployment_mode(context: Any) -> DeploymentMode:
    if context.is_docker:
        return "docker"
    if os.environ.get("SMS_DEPLOYMENT_MODE", "").strip().lower() == "lite":
        return "lite"
    return "native"


# Installer switches for updating SMS Lite in place (SMS_Installer.iss): only the Lite edition's
# files, then start SMS Lite again; the installer first waits for this SMS Lite to exit.
LITE_INSTALLER_ARGS = "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /EDITION=lite /RESTARTLITE=1 /WAITLITE=1"
LITE_EXIT_DELAY_SECONDS = 3.0
HOST_UPDATER_HEARTBEAT_MAX_AGE_SECONDS = 90


class AuthSettingsResponse(BaseModel):
    """Current authentication configuration."""

    auth_enabled: bool = Field(description="Master authentication switch")
    auth_mode: Literal["disabled", "permissive", "strict"] = Field(description="Authorization enforcement mode")
    auth_login_max_attempts: int = Field(description="Max login attempts before lockout")
    auth_login_lockout_seconds: int = Field(description="Lockout duration in seconds")
    auth_login_tracking_window_seconds: int = Field(description="Time window for tracking attempts")
    source: str = Field(description="Configuration source (env, .env file, defaults)")
    effective_policy: str = Field(description="Human-readable policy description")
    effective_policy_key: str = Field(description="Localization key for policy description")


class AuthSettingsUpdate(BaseModel):
    """Request to update authentication settings."""

    auth_enabled: Optional[bool] = None
    auth_mode: Optional[Literal["disabled", "permissive", "strict"]] = None
    auth_login_max_attempts: Optional[int] = Field(None, ge=1, le=100)
    auth_login_lockout_seconds: Optional[int] = Field(None, ge=0, le=3600)


class OperationResult(BaseModel):
    """Generic operation result."""

    success: bool
    message: str
    message_key: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class UpdateCheckResponse(BaseModel):
    """Response from update check."""

    current_version: str
    latest_version: Optional[str] = None
    update_available: bool
    release_url: Optional[str] = None
    release_name: Optional[str] = None
    release_body: Optional[str] = None
    installer_url: Optional[str] = None
    installer_hash: Optional[str] = None
    docker_image_url: Optional[str] = None
    update_instructions: str
    update_instructions_key: Optional[str] = None
    release_channel: Literal["stable", "preview"] = Field(default="stable")
    deployment_mode: DeploymentMode = Field(description="Detected deployment mode for localization")
    # How this instance updates: the installer for its own edition (SMS Lite), the host updater
    # task (Docker), or by hand (a developer checkout). The panel shows the matching action.
    update_method: Literal["installer", "host_task", "manual"] = "manual"
    # Docker only: whether the host updater task is running (its heartbeat is recent).
    host_updater_ready: Optional[bool] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class AutoUpdateRequest(BaseModel):
    """Request payload for auto-update installation."""

    channel: Literal["stable", "preview"] = Field(default="stable")
    install_mode: Literal["silent", "interactive"] = Field(default="silent")
    allow_downgrade: bool = Field(default=False)


class AutoUpdateStatusResponse(BaseModel):
    """Status payload for smart updater progress tracking."""

    job_id: str
    status: Literal["queued", "running", "completed", "failed", "not_found"]
    phase: str
    progress_percent: int = Field(ge=0, le=100)
    current_version: Optional[str] = None
    target_version: Optional[str] = None
    release_channel: Optional[Literal["stable", "preview"]] = None
    release_url: Optional[str] = None
    installer_path: Optional[str] = None
    installer_sha256: Optional[str] = None
    installer_launched: bool = False
    installer_process_id: Optional[int] = None
    bytes_downloaded: Optional[int] = None
    bytes_total: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    updated_at: Optional[str] = None
    phase_history: list[Dict[str, Any]] = Field(default_factory=list)


_AUTO_UPDATE_JOBS: Dict[str, Dict[str, Any]] = {}
_AUTO_UPDATE_LOCK = threading.Lock()
_AUTO_UPDATE_JOB_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _host_updater_trigger_dir() -> Path:
    return Path(os.environ.get("SMS_HOST_UPDATER_TRIGGER_DIR", "/app/data/.triggers"))


def _validate_auto_update_job_id(job_id: str) -> str:
    """Validate updater job ids before using them in filesystem paths."""
    if not _AUTO_UPDATE_JOB_ID_RE.fullmatch(job_id):
        raise ValueError("Invalid updater job id")
    return job_id


def _resolve_host_updater_json_path(job_id: str, prefix: str) -> Path:
    """Resolve a host updater JSON file within the trigger directory safely."""
    trigger_dir = _host_updater_trigger_dir().resolve()
    safe_job_id = _validate_auto_update_job_id(job_id)
    filename = Path(f"{prefix}_{safe_job_id}.json").name
    validate_filename(filename, [".json"])
    candidate = (trigger_dir / filename).resolve()
    try:
        candidate.relative_to(trigger_dir)
    except (ValueError, OSError) as exc:
        raise ValueError("Updater path escaped trigger directory") from exc
    return candidate


def _find_host_updater_json_path(job_id: str, prefix: str) -> Optional[Path]:
    """Find an existing host updater JSON file by exact validated filename."""
    trigger_dir = _host_updater_trigger_dir().resolve()
    safe_job_id = _validate_auto_update_job_id(job_id)
    expected_name = Path(f"{prefix}_{safe_job_id}.json").name
    validate_filename(expected_name, [".json"])

    if not trigger_dir.exists():
        return None

    for candidate in trigger_dir.iterdir():
        if not candidate.is_file() or candidate.name != expected_name:
            continue

        resolved_candidate = candidate.resolve()
        try:
            resolved_candidate.relative_to(trigger_dir)
        except (ValueError, OSError):
            continue
        return resolved_candidate

    return None


def _host_updater_bridge_enabled() -> bool:
    """Determine whether Docker host updater bridge is enabled.

    Modes via SMS_HOST_UPDATER_BRIDGE:
    - true/1/on/enabled: always enabled
    - false/0/off/disabled: always disabled
    - auto (default): enabled when trigger directory is writable/creatable
    """
    mode = os.environ.get("SMS_HOST_UPDATER_BRIDGE", "auto").strip().lower()
    if mode in {"0", "false", "off", "disabled", "no"}:
        return False
    if mode in {"1", "true", "on", "enabled", "yes"}:
        return True

    trigger_dir = _host_updater_trigger_dir()
    try:
        trigger_dir.mkdir(parents=True, exist_ok=True)
        probe = trigger_dir / ".bridge_probe.tmp"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def _host_updater_ready() -> bool:
    """Whether the host updater task is running: it rewrites a heartbeat file every few seconds.

    A request written while nothing watches the trigger directory used to wait forever.
    """
    if not _host_updater_bridge_enabled():
        return False
    heartbeat = _host_updater_trigger_dir() / "update_watcher_heartbeat.json"
    try:
        age = datetime.now(timezone.utc).timestamp() - heartbeat.stat().st_mtime
    except OSError:
        return False
    return age <= HOST_UPDATER_HEARTBEAT_MAX_AGE_SECONDS


def _pick_installer_asset(assets: list[Dict[str, Any]]) -> tuple[Optional[str], Optional[str]]:
    """(download URL, SHA-256) of the release's Windows installer, preferring SMS_Installer_*.exe."""
    candidates = [a for a in assets if str(a.get("name", "")).endswith(".exe") and a.get("browser_download_url")]
    candidates.sort(key=lambda a: 0 if str(a.get("name", "")).startswith("SMS_Installer_") else 1)
    if not candidates:
        return None, None
    chosen = candidates[0]
    installer_hash = _asset_sha256(chosen)
    if not installer_hash:
        sidecar = next(
            (a for a in assets if a.get("name") == f"{chosen.get('name')}.sha256" and a.get("browser_download_url")),
            None,
        ) or next((a for a in assets if str(a.get("name", "")).endswith(".sha256") and a.get("browser_download_url")), None)
        if sidecar:
            installer_hash = _download_text(sidecar["browser_download_url"])
    return chosen["browser_download_url"], installer_hash


def _launch_installer_elevated(installer_path: Path, arguments: str) -> None:
    """Start the installer through UAC. SMS Lite runs unelevated and the installer requires admin
    rights, so CreateProcess (subprocess) fails with ERROR_ELEVATION_REQUIRED; ShellExecute's
    "runas" shows the UAC prompt. Raises OSError (winerror 1223) if the user declines it."""
    startfile = getattr(os, "startfile")  # Windows only
    startfile(str(installer_path), "runas", arguments)


def _schedule_lite_exit(delay_seconds: float = LITE_EXIT_DELAY_SECONDS) -> None:
    """Let the response reach the browser, then end this SMS Lite process so the installer can
    replace its files (the installer waits for it, then starts SMS Lite again)."""
    timer = threading.Timer(delay_seconds, os._exit, args=(0,))
    timer.daemon = True
    timer.start()


def _host_updater_trigger_file(job_id: str) -> Path:
    return _resolve_host_updater_json_path(job_id, "update_request")


def _host_updater_status_file(job_id: str) -> Path:
    return _resolve_host_updater_json_path(job_id, "update_status")


def _write_host_updater_trigger(job_id: str, payload: AutoUpdateRequest, current_version: str) -> Path:
    trigger_dir = _host_updater_trigger_dir()
    trigger_dir.mkdir(parents=True, exist_ok=True)
    trigger_file = _host_updater_trigger_file(job_id)
    # The host task reads only job_id from this file. It decides what to run itself (the latest
    # signed release's installer for the Docker edition, then DOCKER.ps1 -Update), so a file
    # written from inside the container can never choose a command to run on the host.
    trigger_payload = {
        "job_id": job_id,
        "action": "install_latest_release",
        "requested_at": _now_iso(),
        "current_version": current_version,
        "channel": payload.channel,
        "install_mode": payload.install_mode,
        "allow_downgrade": payload.allow_downgrade,
    }
    trigger_file.write_text(json.dumps(trigger_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return trigger_file


def _read_host_updater_status(job_id: str) -> Optional[Dict[str, Any]]:
    try:
        status_file = _find_host_updater_json_path(job_id, "update_status")
    except ValueError:
        return None
    if status_file is None or not status_file.exists():
        return None
    try:
        return json.loads(status_file.read_text(encoding="utf-8"))
    except Exception:
        return None


def _sync_job_from_host_updater_status(job_id: str) -> None:
    status_payload = _read_host_updater_status(job_id)
    if not status_payload:
        return

    raw_status = str(status_payload.get("status", "running")).strip().lower()
    mapped_status: Literal["queued", "running", "completed", "failed"]
    if raw_status in {"queued", "running", "completed", "failed"}:
        mapped_status = cast(Literal["queued", "running", "completed", "failed"], raw_status)
    else:
        mapped_status = "running"

    mapped_phase = str(status_payload.get("phase") or "bridge_waiting").strip() or "bridge_waiting"
    progress = status_payload.get("progress_percent", 0)
    try:
        progress_int = max(0, min(100, int(progress)))
    except Exception:
        progress_int = 0

    updates: Dict[str, Any] = {
        "status": mapped_status,
        "phase": mapped_phase,
        "progress_percent": progress_int,
        "message": status_payload.get("message"),
        "error": status_payload.get("error"),
    }

    if status_payload.get("target_version"):
        updates["target_version"] = str(status_payload.get("target_version"))

    if status_payload.get("release_url"):
        updates["release_url"] = str(status_payload.get("release_url"))

    _update_auto_update_job(job_id, **updates)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _create_auto_update_job(
    *,
    current_version: str,
    channel: Literal["stable", "preview"],
    install_mode: Literal["silent", "interactive"],
) -> str:
    job_id = uuid4().hex
    now = _now_iso()
    job = {
        "job_id": job_id,
        "status": "queued",
        "phase": "queued",
        "progress_percent": 0,
        "current_version": current_version,
        "target_version": None,
        "release_channel": channel,
        "release_url": None,
        "installer_path": None,
        "installer_sha256": None,
        "installer_launched": False,
        "installer_process_id": None,
        "bytes_downloaded": 0,
        "bytes_total": None,
        "install_mode": install_mode,
        "message": "Update job queued.",
        "error": None,
        "started_at": now,
        "updated_at": now,
        "phase_history": [
            {
                "phase": "queued",
                "status": "queued",
                "progress_percent": 0,
                "message": "Update job queued.",
                "timestamp": now,
            }
        ],
    }
    with _AUTO_UPDATE_LOCK:
        _AUTO_UPDATE_JOBS[job_id] = job
    return job_id


def _update_auto_update_job(job_id: str, **updates: Any) -> None:
    with _AUTO_UPDATE_LOCK:
        job = _AUTO_UPDATE_JOBS.get(job_id)
        if not job:
            return
        previous_phase = job.get("phase")
        previous_status = job.get("status")
        job.update(updates)
        updated_at = _now_iso()
        job["updated_at"] = updated_at

        phase_history = job.setdefault("phase_history", [])
        new_phase = job.get("phase")
        new_status = job.get("status")

        should_append = (
            previous_phase != new_phase
            or previous_status != new_status
            or (
                "message" in updates
                and updates.get("message")
                and updates.get("message") != phase_history[-1].get("message")
                if phase_history
                else False
            )
        )

        if should_append:
            phase_history.append(
                {
                    "phase": new_phase,
                    "status": new_status,
                    "progress_percent": job.get("progress_percent"),
                    "message": job.get("message"),
                    "timestamp": updated_at,
                }
            )
            if len(phase_history) > 50:
                del phase_history[:-50]


def _get_auto_update_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _AUTO_UPDATE_LOCK:
        job = _AUTO_UPDATE_JOBS.get(job_id)
        return dict(job) if job else None


def _mark_auto_update_failed(job_id: str, message: str, *, error: Optional[str] = None) -> None:
    _update_auto_update_job(
        job_id,
        status="failed",
        phase="failed",
        message=message,
        error=error or message,
    )


def _start_auto_update_job(job_id: str, payload: AutoUpdateRequest, current_version: str) -> None:
    worker = threading.Thread(
        target=_run_auto_update_job,
        args=(job_id, payload, current_version),
        daemon=True,
        name=f"smart-updater-{job_id[:8]}",
    )
    worker.start()


def _run_auto_update_job(job_id: str, payload: AutoUpdateRequest, current_version: str) -> None:
    try:
        _update_auto_update_job(
            job_id, status="running", phase="fetch_release", progress_percent=5, message="Fetching release metadata."
        )
        release = _fetch_github_release(channel=payload.channel)
        if not release:
            _mark_auto_update_failed(job_id, "Could not fetch release metadata for update.")
            return

        latest_version = str(release.get("tag_name", "")).lstrip("v")
        if not latest_version:
            _mark_auto_update_failed(job_id, "Release metadata did not include a valid version.")
            return

        if not payload.allow_downgrade and not _version_is_newer(latest_version, current_version):
            _mark_auto_update_failed(job_id, "No newer update available for the selected channel.")
            return

        installer_url, installer_hash = _pick_installer_asset(release.get("assets", []) or [])

        if not installer_url:
            _mark_auto_update_failed(job_id, "No Windows installer asset was found for the selected release.")
            return

        updates_dir = _get_updates_download_dir()
        updates_dir.mkdir(parents=True, exist_ok=True)
        installer_filename = Path(urlparse(installer_url).path).name or f"SMS_Installer_{latest_version}.exe"
        installer_path = updates_dir / installer_filename

        _update_auto_update_job(
            job_id,
            phase="downloading",
            progress_percent=10,
            target_version=latest_version,
            release_url=release.get("html_url"),
            installer_path=str(installer_path),
            message="Downloading installer.",
        )

        def _progress(downloaded: int, total: Optional[int]) -> None:
            progress = 10
            if total and total > 0:
                ratio = min(1.0, downloaded / total)
                progress = 10 + int(ratio * 70)
            _update_auto_update_job(
                job_id,
                phase="downloading",
                progress_percent=progress,
                bytes_downloaded=downloaded,
                bytes_total=total,
                message="Downloading installer.",
            )

        computed_hash = _download_file(installer_url, installer_path, progress_callback=_progress)

        _update_auto_update_job(job_id, phase="verifying", progress_percent=85, message="Verifying installer checksum.")
        expected_hash = _extract_sha256(installer_hash)
        if not expected_hash:
            # Without a published hash there is nothing to check the download against.
            installer_path.unlink(missing_ok=True)
            _mark_auto_update_failed(job_id, "The release publishes no SHA-256 for its installer; not installing it.")
            return
        if computed_hash.lower() != expected_hash.lower():
            installer_path.unlink(missing_ok=True)
            _mark_auto_update_failed(
                job_id,
                "Downloaded installer failed SHA256 verification.",
                error=f"Expected {expected_hash}, got {computed_hash}",
            )
            return

        # SMS Lite: install only the Lite edition, in place, then start SMS Lite again.
        _update_auto_update_job(
            job_id,
            phase="launching",
            progress_percent=95,
            message="Waiting for the Windows security prompt (UAC).",
        )
        try:
            _launch_installer_elevated(installer_path, LITE_INSTALLER_ARGS)
        except OSError as exc:
            declined = getattr(exc, "winerror", None) == 1223
            _mark_auto_update_failed(
                job_id,
                "The update was cancelled at the Windows security prompt."
                if declined
                else "The installer could not be started.",
                error=str(exc),
            )
            return

        _update_auto_update_job(
            job_id,
            status="completed",
            phase="completed",
            progress_percent=100,
            installer_sha256=computed_hash,
            installer_launched=True,
            message="SMS Lite is closing to update and will start again in about a minute.",
            error=None,
        )
        _schedule_lite_exit()
    except Exception as exc:  # pragma: no cover - defensive catch
        logger.error("Smart updater job failed: %s", exc, exc_info=True)
        _mark_auto_update_failed(job_id, "Updater job failed unexpectedly.", error=str(exc))


def _get_policy_description(enabled: bool, mode: str) -> str:
    """Generate human-readable policy description."""
    if not enabled:
        return "🔓 No authentication required (all endpoints public)"

    if mode == "disabled":
        return "🔓 No authentication required (all endpoints public)"
    if mode == "permissive":
        return "⚠️ Requests without a login are NOT checked (anyone who can reach the server has full access)"
    if mode == "strict":
        return "🔒 Login required, roles enforced (recommended)"
    return f"⚠️ Unknown mode: {mode}"


def _get_policy_key(enabled: bool, mode: str) -> str:
    """Generate localization key for policy."""
    if not enabled:
        return "auth.policy.disabled"
    if mode in ["disabled", "permissive", "strict"]:
        return f"auth.policy.{mode}"
    return "auth.policy.unknown"


def _resolve_env_file() -> tuple[Path, str]:
    """Resolve the active .env file path and its source name."""
    project_root = Path(__file__).resolve().parents[3]
    backend_env = project_root / "backend" / ".env"
    root_env = project_root / ".env"

    if backend_env.exists():
        return backend_env, "backend/.env"
    return root_env, ".env"


@router.get("/maintenance/auth-settings", response_model=AuthSettingsResponse)
def get_auth_settings(_request: Request, _auth=Depends(require_control_admin)):
    """Get current authentication and authorization settings.

    Returns the effective configuration including AUTH_ENABLED and AUTH_MODE.
    """
    from backend.config import settings

    # Determine source
    env_file, source_name = _resolve_env_file()

    if env_file.exists():
        source = source_name
    elif any(k.startswith("AUTH_") for k in os.environ):
        source = "environment variables"
    else:
        source = "defaults"

    auth_enabled = bool(getattr(settings, "AUTH_ENABLED", False))
    auth_mode_raw = str(getattr(settings, "AUTH_MODE", "disabled"))
    auth_mode: Literal["disabled", "permissive", "strict"]
    if auth_mode_raw in {"disabled", "permissive", "strict"}:
        auth_mode = cast(Literal["disabled", "permissive", "strict"], auth_mode_raw)
    else:
        auth_mode = "disabled"

    return AuthSettingsResponse(
        auth_enabled=auth_enabled,
        auth_mode=auth_mode,
        auth_login_max_attempts=getattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 5),
        auth_login_lockout_seconds=getattr(settings, "AUTH_LOGIN_LOCKOUT_SECONDS", 300),
        auth_login_tracking_window_seconds=getattr(settings, "AUTH_LOGIN_TRACKING_WINDOW_SECONDS", 300),
        source=source,
        effective_policy=_get_policy_description(auth_enabled, auth_mode),
        effective_policy_key=_get_policy_key(auth_enabled, auth_mode),
    )


@router.post("/maintenance/auth-settings", response_model=OperationResult)
def update_auth_settings(payload: AuthSettingsUpdate, _request: Request, _auth=Depends(require_control_admin)):
    """Update authentication settings by modifying .env file.

    ⚠️ Requires application restart to take effect.

    Supports:
    - AUTH_ENABLED: Master authentication switch
    - AUTH_MODE: Authorization enforcement level (disabled/permissive/strict)
    - AUTH_LOGIN_MAX_ATTEMPTS: Login attempt limit
    - AUTH_LOGIN_LOCKOUT_SECONDS: Lockout duration
    """
    try:
        env_file, _ = _resolve_env_file()

        if not env_file.exists():
            # Create from .env.example if available
            example_file = env_file.parent / ".env.example"
            if example_file.exists():
                env_file.write_text(example_file.read_text(encoding="utf-8"), encoding="utf-8")
            else:
                return OperationResult(
                    success=False,
                    message="No .env file found and no .env.example to copy from",
                    message_key="maintenance.auth.no_env_file",
                    details={"expected_path": str(env_file)},
                )

        lines = env_file.read_text(encoding="utf-8").splitlines()
        updated_lines: list[str] = []
        updated_keys: set[str] = set()

        for line in lines:
            stripped = line.strip()

            if payload.auth_enabled is not None and stripped.startswith("AUTH_ENABLED="):
                updated_lines.append(f"AUTH_ENABLED={str(payload.auth_enabled).lower()}")
                updated_keys.add("AUTH_ENABLED")
            elif payload.auth_mode is not None and stripped.startswith("AUTH_MODE="):
                updated_lines.append(f"AUTH_MODE={payload.auth_mode}")
                updated_keys.add("AUTH_MODE")
            elif payload.auth_login_max_attempts is not None and stripped.startswith("AUTH_LOGIN_MAX_ATTEMPTS="):
                updated_lines.append(f"AUTH_LOGIN_MAX_ATTEMPTS={payload.auth_login_max_attempts}")
                updated_keys.add("AUTH_LOGIN_MAX_ATTEMPTS")
            elif payload.auth_login_lockout_seconds is not None and stripped.startswith("AUTH_LOGIN_LOCKOUT_SECONDS="):
                updated_lines.append(f"AUTH_LOGIN_LOCKOUT_SECONDS={payload.auth_login_lockout_seconds}")
                updated_keys.add("AUTH_LOGIN_LOCKOUT_SECONDS")
            else:
                updated_lines.append(line)

        new_keys: list[str] = []
        if payload.auth_enabled is not None and "AUTH_ENABLED" not in updated_keys:
            new_keys.append(f"AUTH_ENABLED={str(payload.auth_enabled).lower()}")
        if payload.auth_mode is not None and "AUTH_MODE" not in updated_keys:
            new_keys.append(f"AUTH_MODE={payload.auth_mode}")
        if payload.auth_login_max_attempts is not None and "AUTH_LOGIN_MAX_ATTEMPTS" not in updated_keys:
            new_keys.append(f"AUTH_LOGIN_MAX_ATTEMPTS={payload.auth_login_max_attempts}")
        if payload.auth_login_lockout_seconds is not None and "AUTH_LOGIN_LOCKOUT_SECONDS" not in updated_keys:
            new_keys.append(f"AUTH_LOGIN_LOCKOUT_SECONDS={payload.auth_login_lockout_seconds}")

        if new_keys:
            auth_section_idx = -1
            for i, line in enumerate(updated_lines):
                if "AUTHENTICATION" in line and line.strip().startswith("#"):
                    auth_section_idx = i
                    break

            if auth_section_idx >= 0:
                insert_idx = len(updated_lines)  # Default to end of file
                for j in range(auth_section_idx + 1, len(updated_lines)):
                    if updated_lines[j].strip().startswith("# ==="):
                        insert_idx = j
                        break

                for key in reversed(new_keys):
                    updated_lines.insert(insert_idx, key)
            else:
                if updated_lines and not updated_lines[-1].strip():
                    updated_lines.extend(new_keys)
                else:
                    updated_lines.append("")
                    updated_lines.extend(new_keys)

        env_file.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")

        # Recompute effective policy (best-effort)
        from backend.config import get_settings

        settings = get_settings()
        effective_auth_enabled = (
            payload.auth_enabled if payload.auth_enabled is not None else getattr(settings, "AUTH_ENABLED", False)
        )
        effective_auth_mode = (
            payload.auth_mode if payload.auth_mode is not None else getattr(settings, "AUTH_MODE", "disabled")
        )

        updated_values: Dict[str, Any] = {}
        if payload.auth_enabled is not None:
            updated_values["AUTH_ENABLED"] = payload.auth_enabled
        if payload.auth_mode is not None:
            updated_values["AUTH_MODE"] = payload.auth_mode
        if payload.auth_login_max_attempts is not None:
            updated_values["AUTH_LOGIN_MAX_ATTEMPTS"] = payload.auth_login_max_attempts
        if payload.auth_login_lockout_seconds is not None:
            updated_values["AUTH_LOGIN_LOCKOUT_SECONDS"] = payload.auth_login_lockout_seconds

        return OperationResult(
            success=True,
            message=f"Authentication settings updated in {env_file.name}. Restart required to take effect.",
            message_key="maintenance.auth.update_success",
            details={
                "file": str(env_file),
                "updated_values": updated_values,
                "effective_policy": _get_policy_description(effective_auth_enabled, effective_auth_mode),
                "requires_restart": True,
            },
        )
    except Exception as e:
        logger.error(f"Failed to update authentication settings: {e}", exc_info=True)
        return OperationResult(
            success=False,
            message="Failed to update authentication settings",
            message_key="maintenance.auth.update_error",
        )


@router.get("/maintenance/auth-policy-guide")
def get_auth_policy_guide(_auth=Depends(require_control_admin)):
    """Get detailed guide on authentication policies."""
    return {
        "policies": {
            "disabled": {
                "description": "No authentication required",
                "use_case": "Development, testing, or fully public systems",
                "security_level": "None",
                "behavior": "All endpoints accessible without login",
                "icon": "🔓",
            },
            "permissive": {
                "description": "Requests without a login skip all checks; logged-in users get role checks",
                "use_case": "Automated tests / E2E only -- never on a server others can reach",
                "security_level": "None for anonymous requests",
                "behavior": "Anyone who can reach the server can read and change data without logging in",
                "icon": "⚠️",
            },
            "strict": {
                "description": "Login required and role-based access control (RBAC) enforced",
                "use_case": "Every real deployment (Native, Docker, Lite)",
                "security_level": "High",
                "behavior": "Requests need a valid login; endpoints check user roles",
                "icon": "🔒",
                "recommended": True,
            },
        },
        "settings": {
            "AUTH_ENABLED": {
                "type": "boolean",
                "default": True,
                "description": "Master authentication switch. If false, overrides AUTH_MODE.",
            },
            "AUTH_MODE": {
                "type": "string",
                "default": "strict",
                "options": ["disabled", "permissive", "strict"],
                "description": "Authorization enforcement level",
            },
            "AUTH_LOGIN_MAX_ATTEMPTS": {
                "type": "integer",
                "default": 5,
                "range": "1-100",
                "description": "Maximum failed login attempts before account lockout",
            },
            "AUTH_LOGIN_LOCKOUT_SECONDS": {
                "type": "integer",
                "default": 300,
                "range": "0-3600",
                "description": "Account lockout duration in seconds (300 = 5 minutes)",
            },
        },
        "examples": {
            "development": {
                "AUTH_ENABLED": False,
                "AUTH_MODE": "disabled",
                "description": "No authentication for quick development",
            },
            "production_recommended": {
                "AUTH_ENABLED": True,
                "AUTH_MODE": "strict",
                "description": "Login required, full RBAC with role enforcement",
            },
            "automated_tests": {
                "AUTH_ENABLED": True,
                "AUTH_MODE": "permissive",
                "description": "Anonymous requests unchecked -- test runners only",
            },
        },
    }


@router.get("/maintenance/updates/check", response_model=UpdateCheckResponse)
def check_for_updates(
    _request: Request, channel: Literal["stable", "preview"] = "stable", _auth=Depends(require_control_admin)
):
    """Check for available updates from GitHub releases."""
    from backend.environment import get_runtime_context

    context = get_runtime_context()
    deployment_mode = _deployment_mode(context)
    update_method: Literal["installer", "host_task", "manual"] = (
        "installer" if deployment_mode == "lite" else "host_task" if deployment_mode == "docker" else "manual"
    )
    host_updater_ready = _host_updater_ready() if deployment_mode == "docker" else None

    current_version = _get_version()

    try:
        latest_release = _fetch_github_release(channel=channel)
        if not latest_release:
            return UpdateCheckResponse(
                current_version=current_version,
                latest_version=None,
                update_available=False,
                update_instructions="Could not check for updates. Please check manually at https://github.com/bs1gr/AUT_MIEEK_SMS/releases",
                update_instructions_key="maintenance.update.check_error",
                release_channel=channel,
                deployment_mode=deployment_mode,
                update_method=update_method,
                host_updater_ready=host_updater_ready,
            )

        latest_version = str(latest_release.get("tag_name", "")).lstrip("v")
        update_available = _version_is_newer(latest_version, current_version)

        installer_url, installer_hash = _pick_installer_asset(latest_release.get("assets", []) or [])

        if deployment_mode == "docker":
            # DOCKER.ps1 -UpdateClean only rebuilds the sources already installed; a new release
            # needs the new installer. The host updater task does both.
            instructions = (
                "Docker edition: Update asks the host updater task to install this release on the host.\n"
                "It downloads the Docker edition's installer, checks its SHA-256 and signature, installs it,\n"
                "rebuilds the container and starts it again. The app is unavailable for a few minutes.\n\n"
                "Without the task, on the host (in the SMS folder, as administrator):\n"
                "  1. Run the new SMS_Installer and keep the Docker edition.\n"
                "  2. .\\DOCKER.ps1 -Update"
            )
            instructions_key = "maintenance.update.instructions_docker"
        elif deployment_mode == "lite":
            instructions = (
                "SMS Lite: Update downloads the installer, checks its SHA-256 and installs only SMS Lite,\n"
                "keeping your data and settings. Windows asks for permission (UAC); SMS Lite then closes\n"
                "and starts again by itself in about a minute."
            )
            instructions_key = "maintenance.update.instructions_lite"
        else:
            instructions = (
                "Developer checkout (NATIVE.ps1): update the source code, not with the installer.\n"
                "  1. .\\infra\\scripts\\dev\\NATIVE.ps1 -Stop\n"
                "  2. git pull --ff-only\n"
                "  3. .\\infra\\scripts\\dev\\NATIVE.ps1 -Setup\n"
                "  4. .\\infra\\scripts\\dev\\NATIVE.ps1 -Start"
            )
            instructions_key = "maintenance.update.instructions_native"

        return UpdateCheckResponse(
            current_version=current_version,
            latest_version=latest_version or None,
            update_available=update_available,
            release_url=latest_release.get("html_url"),
            release_name=latest_release.get("name"),
            release_body=latest_release.get("body"),
            installer_url=installer_url,
            installer_hash=installer_hash,
            docker_image_url="https://github.com/bs1gr/AUT_MIEEK_SMS/pkgs/container/sms-backend",
            update_instructions=instructions,
            update_instructions_key=instructions_key,
            release_channel=channel,
            deployment_mode=deployment_mode,
            update_method=update_method,
            host_updater_ready=host_updater_ready,
        )
    except Exception as exc:
        logger.error("Error checking for updates: %s", exc, exc_info=True)
        return UpdateCheckResponse(
            current_version=current_version,
            latest_version=None,
            update_available=False,
            update_instructions=f"Error checking for updates: {str(exc)}. Please check manually at https://github.com/bs1gr/AUT_MIEEK_SMS/releases",
            update_instructions_key="maintenance.update.check_error",
            release_channel=channel,
            deployment_mode=deployment_mode,
            update_method=update_method,
            host_updater_ready=host_updater_ready,
        )


@router.post("/maintenance/updates/auto-install", response_model=OperationResult)
def auto_install_update(payload: AutoUpdateRequest, _request: Request, _auth=Depends(require_control_admin)):
    """Update this instance in place, the way its edition updates.

    - SMS Lite: download the installer, verify it, and install only the Lite edition (UAC).
    - Docker: ask the host updater task (registered by the installer) to install the release.
    - Developer checkout (native): refused - update it with git (see the check's instructions).
    """
    from backend.environment import get_runtime_context

    context = get_runtime_context()
    mode = _deployment_mode(context)
    if mode == "docker":
        if _host_updater_ready():
            current_version = _get_version()
            job_id = _create_auto_update_job(
                current_version=current_version,
                channel=payload.channel,
                install_mode=payload.install_mode,
            )
            _update_auto_update_job(
                job_id,
                status="running",
                phase="bridge_queued",
                progress_percent=5,
                message="Update requested. Waiting for the host updater task to install the release.",
            )

            try:
                trigger_file = _write_host_updater_trigger(job_id, payload, current_version)
            except Exception as exc:
                _mark_auto_update_failed(
                    job_id,
                    "Failed to enqueue host updater bridge trigger.",
                    error=str(exc),
                )
                return OperationResult(
                    success=False,
                    message=(
                        "Failed to write host updater trigger file. "
                        "Ensure trigger bind mount is configured and watcher service is running."
                    ),
                    message_key="maintenance.update.host_bridge_trigger_failed",
                    details={
                        "deployment_mode": "docker",
                        "job_id": job_id,
                        "trigger_dir": str(_host_updater_trigger_dir()),
                        "error": str(exc),
                    },
                )

            return OperationResult(
                success=True,
                message=(
                    "Update requested. The host updater task installs the release, rebuilds the "
                    "container and starts it again; the app is unavailable for a few minutes."
                ),
                message_key="maintenance.update.host_bridge_started",
                details={
                    "deployment_mode": "docker",
                    "mode": "docker_host_bridge",
                    "job_id": job_id,
                    "trigger_file": str(trigger_file),
                    "status_endpoint": f"/control/api/maintenance/updates/auto-install/{job_id}/status",
                },
            )

        return OperationResult(
            success=False,
            message=(
                "The host updater task is not running, so the update cannot start from here. "
                "On the host: run the new SMS_Installer (Docker edition), then .\\DOCKER.ps1 -Update."
            ),
            message_key="maintenance.update.auto_install_docker_blocked",
            details={
                "deployment_mode": "docker",
                "bridge_enabled": _host_updater_bridge_enabled(),
                "host_updater_ready": False,
                "bridge_mode": os.environ.get("SMS_HOST_UPDATER_BRIDGE", "auto"),
            },
        )

    if mode == "native":
        return OperationResult(
            success=False,
            message=(
                "This is a developer checkout: update it with git, not with the installer "
                "(NATIVE.ps1 -Stop, git pull --ff-only, NATIVE.ps1 -Setup, NATIVE.ps1 -Start)."
            ),
            message_key="maintenance.update.auto_install_native_manual",
            details={"deployment_mode": "native"},
        )

    if not _is_native_windows():
        return OperationResult(
            success=False,
            message="Automatic installer updates are currently supported on Windows only.",
            message_key="maintenance.update.auto_install_windows_only",
            details={"platform": os.name},
        )

    current_version = _get_version()
    job_id = _create_auto_update_job(
        current_version=current_version,
        channel=payload.channel,
        install_mode=payload.install_mode,
    )
    _start_auto_update_job(job_id, payload, current_version)

    return OperationResult(
        success=True,
        message="Smart updater started. Track progress from the updater timeline.",
        message_key="maintenance.update.auto_install_started",
        details={
            "current_version": current_version,
            "channel": payload.channel,
            "install_mode": payload.install_mode,
            "job_id": job_id,
            "status_endpoint": f"/control/api/maintenance/updates/auto-install/{job_id}/status",
        },
    )


@router.get("/maintenance/updates/auto-install/{job_id}/status", response_model=AutoUpdateStatusResponse)
def get_auto_install_update_status(job_id: str, _request: Request, _auth=Depends(require_control_admin)):
    """Get smart updater job progress and installer launch state."""
    try:
        safe_job_id = _validate_auto_update_job_id(job_id)
    except ValueError:
        return AutoUpdateStatusResponse(
            job_id=job_id,
            status="not_found",
            phase="not_found",
            progress_percent=0,
            message="No updater job found for the requested id.",
            error="not_found",
            phase_history=[],
        )

    _sync_job_from_host_updater_status(safe_job_id)
    job = _get_auto_update_job(safe_job_id)
    if not job:
        # Docker: the update rebuilds this container, so the job held in memory is gone when the
        # app is back. The host task's status file still says how it ended.
        host_status = _read_host_updater_status(safe_job_id)
        if host_status:
            raw = str(host_status.get("status", "running")).strip().lower()
            try:
                progress = max(0, min(100, int(host_status.get("progress_percent", 0))))
            except (TypeError, ValueError):
                progress = 0
            return AutoUpdateStatusResponse(
                job_id=safe_job_id,
                status=raw if raw in {"queued", "running", "completed", "failed"} else "running",  # type: ignore[arg-type]
                phase=str(host_status.get("phase") or "bridge_waiting"),
                progress_percent=progress,
                target_version=host_status.get("target_version"),
                message=host_status.get("message"),
                error=host_status.get("error"),
                updated_at=host_status.get("updated_at"),
                phase_history=[],
            )
        return AutoUpdateStatusResponse(
            job_id=safe_job_id,
            status="not_found",
            phase="not_found",
            progress_percent=0,
            message="No updater job found for the requested id.",
            error="not_found",
            phase_history=[],
        )

    return AutoUpdateStatusResponse(**job)


def _get_version() -> str:
    """Read version from VERSION file or default."""
    version_file = Path(__file__).resolve().parents[4] / "VERSION"
    if version_file.exists():
        return version_file.read_text(encoding="utf-8").strip()
    return "unknown"


def _download_text(url: str) -> Optional[str]:
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode("utf-8", errors="replace").strip()
    except Exception:
        return None


def _extract_sha256(raw_hash: Optional[str]) -> Optional[str]:
    if not raw_hash:
        return None
    token = raw_hash.strip().split()[0].strip()
    if token.lower().startswith("sha256:"):
        token = token.split(":", 1)[1].strip()
    if len(token) == 64 and all(c in "0123456789abcdefABCDEF" for c in token):
        return token
    return None


def _asset_sha256(asset: Dict[str, Any]) -> Optional[str]:
    """Extract SHA256 from release asset digest metadata or legacy sidecar content."""
    digest = asset.get("digest")
    if isinstance(digest, str):
        parsed = _extract_sha256(digest)
        if parsed:
            return parsed

    sha_value = asset.get("sha256")
    if isinstance(sha_value, str):
        parsed = _extract_sha256(sha_value)
        if parsed:
            return parsed

    return None


def _get_updates_download_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "artifacts" / "updates"


def _download_file(
    url: str,
    destination: Path,
    progress_callback: Optional[Callable[[int, Optional[int]], None]] = None,
) -> str:
    """Download a file to destination and return SHA256 hash."""
    hasher = hashlib.sha256()
    downloaded = 0
    with urllib.request.urlopen(url, timeout=60) as response, destination.open("wb") as out_file:
        header_value = response.headers.get("Content-Length")
        total_bytes = int(header_value) if header_value and header_value.isdigit() else None
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out_file.write(chunk)
            hasher.update(chunk)
            downloaded += len(chunk)
            if progress_callback:
                progress_callback(downloaded, total_bytes)
    return hasher.hexdigest()


def _normalize_release(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize 'gh release view' JSON or GitHub REST API JSON into a common shape."""
    tag = raw.get("tag_name") or raw.get("tagName") or ""
    html = raw.get("html_url") or raw.get("htmlUrl") or raw.get("url")
    name = raw.get("name")
    body = raw.get("body")

    assets_in = raw.get("assets") or []
    assets_out = []

    # If gh CLI output: craft download URLs (they follow releases/download/<tag>/<asset>)
    if "tagName" in raw and isinstance(assets_in, list):
        for a in assets_in:
            aname = a.get("name")
            if not aname:
                continue
            assets_out.append(
                {
                    "name": aname,
                    "browser_download_url": f"https://github.com/bs1gr/AUT_MIEEK_SMS/releases/download/{tag}/{aname}",
                    "digest": a.get("digest"),
                }
            )
    else:
        # REST API output already contains browser_download_url
        for a in assets_in if isinstance(assets_in, list) else []:
            aname = a.get("name")
            dl = a.get("browser_download_url")
            if aname and dl:
                assets_out.append({"name": aname, "browser_download_url": dl, "digest": a.get("digest")})

    return {
        "tag_name": tag,
        "html_url": html,
        "name": name,
        "body": body,
        "assets": assets_out,
    }


def _fetch_github_release(channel: Literal["stable", "preview"] = "stable") -> Optional[Dict[str, Any]]:
    """Fetch release info from GitHub for stable or preview channels."""
    if channel == "preview":
        return _fetch_github_preview_release()

    # Stable: use GitHub REST API (avoids gh CLI subprocess which can crash
    # with 0xc0000142 DLL init failure under uvicorn's reloader on Windows)
    try:
        import urllib.request

        url = "https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases/latest"
        with urllib.request.urlopen(url, timeout=10) as response:
            raw = json.loads(response.read().decode("utf-8", errors="replace"))
            return _normalize_release(raw)
    except Exception as exc:
        logger.debug("GitHub REST release fetch failed", extra={"error": str(exc)})
        return None


def _fetch_github_preview_release() -> Optional[Dict[str, Any]]:
    """Fetch newest non-draft release, including prereleases."""
    try:
        url = "https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases"
        with urllib.request.urlopen(url, timeout=10) as response:
            raw_list = json.loads(response.read().decode("utf-8", errors="replace"))
            if not isinstance(raw_list, list):
                return None

            for raw in raw_list:
                if not isinstance(raw, dict):
                    continue
                if raw.get("draft") is True:
                    continue
                return _normalize_release(raw)
            return None
    except Exception as exc:
        logger.debug("GitHub preview release fetch failed", extra={"error": str(exc)})
        return None


def _version_is_newer(latest: str, current: str) -> bool:
    """Compare semantic versions. Returns True if latest > current."""
    try:

        def parse_version(v: str) -> tuple[int, int, int]:
            parts = v.lstrip("v").split(".")
            return (int(parts[0]), int(parts[1]), int(parts[2]))

        return parse_version(latest) > parse_version(current)
    except Exception as exc:
        logger.debug("Version comparison failed", extra={"error": str(exc), "latest": latest, "current": current})
        return False
