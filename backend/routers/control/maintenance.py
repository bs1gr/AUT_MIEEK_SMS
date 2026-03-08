"""Maintenance and configuration management endpoints for Control Panel.

Provides admin interface for managing application settings, particularly
authentication and authorization policies.
"""

from __future__ import annotations

import json
import hashlib
import logging
import os
import subprocess
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

from .common import _hidden_window_kwargs

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_native_windows() -> bool:
    """Check if running natively on Windows (safe to mock without corrupting os.name)."""
    return os.name == "nt"


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
    deployment_mode: Literal["docker", "native"] = Field(description="Detected deployment mode for localization")
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


def _host_updater_trigger_dir() -> Path:
    return Path(os.environ.get("SMS_HOST_UPDATER_TRIGGER_DIR", "/app/data/.triggers"))


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


def _host_updater_trigger_file(job_id: str) -> Path:
    return _host_updater_trigger_dir() / f"update_request_{job_id}.json"


def _host_updater_status_file(job_id: str) -> Path:
    return _host_updater_trigger_dir() / f"update_status_{job_id}.json"


def _write_host_updater_trigger(job_id: str, payload: AutoUpdateRequest, current_version: str) -> Path:
    trigger_dir = _host_updater_trigger_dir()
    trigger_dir.mkdir(parents=True, exist_ok=True)
    trigger_file = _host_updater_trigger_file(job_id)
    trigger_payload = {
        "job_id": job_id,
        "action": "docker_update_clean",
        "command": ".\\DOCKER.ps1 -UpdateClean",
        "requested_at": _now_iso(),
        "current_version": current_version,
        "channel": payload.channel,
        "install_mode": payload.install_mode,
        "allow_downgrade": payload.allow_downgrade,
    }
    trigger_file.write_text(json.dumps(trigger_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return trigger_file


def _read_host_updater_status(job_id: str) -> Optional[Dict[str, Any]]:
    status_file = _host_updater_status_file(job_id)
    if not status_file.exists():
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

        installer_url: Optional[str] = None
        installer_hash: Optional[str] = None
        for asset in release.get("assets", []) or []:
            name = asset.get("name", "")
            url = asset.get("browser_download_url")
            if not name or not url:
                continue
            if name.endswith(".exe") and not installer_url:
                installer_url = url
            elif name.endswith(".sha256") and not installer_hash:
                installer_hash = _download_text(url)

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
        if expected_hash and computed_hash.lower() != expected_hash.lower():
            installer_path.unlink(missing_ok=True)
            _mark_auto_update_failed(
                job_id,
                "Downloaded installer failed SHA256 verification.",
                error=f"Expected {expected_hash}, got {computed_hash}",
            )
            return

        cmd = [str(installer_path)]
        if payload.install_mode == "silent":
            cmd.extend(
                [
                    "/VERYSILENT",
                    "/SUPPRESSMSGBOXES",
                    "/NORESTART",
                    "/CLOSEAPPLICATIONS",
                    "/SP-",
                ]
            )
        else:
            cmd.append("/CLOSEAPPLICATIONS")

        _update_auto_update_job(job_id, phase="launching", progress_percent=95, message="Launching installer.")
        proc = _launch_installer(cmd)

        _update_auto_update_job(
            job_id,
            status="completed",
            phase="completed",
            progress_percent=100,
            installer_sha256=computed_hash,
            installer_launched=True,
            installer_process_id=proc.pid,
            message="Installer launched. Follow installer prompts to finish update.",
            error=None,
        )
    except Exception as exc:  # pragma: no cover - defensive catch
        logger.error("Smart updater job failed: %s", exc, exc_info=True)
        _mark_auto_update_failed(job_id, "Updater job failed unexpectedly.", error=str(exc))


def _launch_installer(cmd: list[str]) -> subprocess.Popen:
    creation_flags = 0
    if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
        creation_flags |= subprocess.CREATE_NEW_PROCESS_GROUP
    if hasattr(subprocess, "DETACHED_PROCESS"):
        creation_flags |= subprocess.DETACHED_PROCESS

    si_kwargs = _hidden_window_kwargs()
    return subprocess.Popen(
        cmd,
        cwd=str(Path(__file__).resolve().parents[3]),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=creation_flags,
        startupinfo=si_kwargs.get("startupinfo"),
    )


def _get_policy_description(enabled: bool, mode: str) -> str:
    """Generate human-readable policy description."""
    if not enabled:
        return "🔓 No authentication required (all endpoints public)"

    if mode == "disabled":
        return "🔓 No authentication required (all endpoints public)"
    if mode == "permissive":
        return "🔐 Authentication required, but all authenticated users have full access (recommended)"
    if mode == "strict":
        return "🔒 Full role-based access control (admin/teacher roles strictly enforced)"
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
def get_auth_settings(_request: Request):
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
def update_auth_settings(payload: AuthSettingsUpdate, _request: Request):
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
        return OperationResult(
            success=False,
            message=f"Failed to update authentication settings: {str(e)}",
            message_key="maintenance.auth.update_error",
            details={"error": str(e), "type": type(e).__name__},
        )


@router.get("/maintenance/auth-policy-guide")
def get_auth_policy_guide():
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
                "description": "Authentication required, but all authenticated users have full access",
                "use_case": "Production systems where all users are trusted (recommended)",
                "security_level": "Medium",
                "behavior": "Users must login, but can access all endpoints regardless of role",
                "icon": "🔐",
                "recommended": True,
            },
            "strict": {
                "description": "Full role-based access control (RBAC)",
                "use_case": "High-security environments with distinct admin/teacher/student roles",
                "security_level": "High",
                "behavior": "Endpoints check user roles, deny access if role doesn't match",
                "icon": "🔒",
            },
        },
        "settings": {
            "AUTH_ENABLED": {
                "type": "boolean",
                "default": False,
                "description": "Master authentication switch. If false, overrides AUTH_MODE.",
            },
            "AUTH_MODE": {
                "type": "string",
                "default": "disabled",
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
                "AUTH_MODE": "permissive",
                "description": "Users must login but no role restrictions",
            },
            "high_security": {
                "AUTH_ENABLED": True,
                "AUTH_MODE": "strict",
                "description": "Full RBAC with role enforcement",
            },
        },
    }


@router.get("/maintenance/updates/check", response_model=UpdateCheckResponse)
def check_for_updates(_request: Request, channel: Literal["stable", "preview"] = "stable"):
    """Check for available updates from GitHub releases."""
    from backend.environment import get_runtime_context

    context = get_runtime_context()
    deployment_mode: Literal["docker", "native"] = "docker" if context.is_docker else "native"

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
            )

        latest_version = str(latest_release.get("tag_name", "")).lstrip("v")
        update_available = _version_is_newer(latest_version, current_version)

        assets = latest_release.get("assets", []) or []
        installer_url: Optional[str] = None
        installer_hash: Optional[str] = None

        for asset in assets:
            name = asset.get("name", "")
            url = asset.get("browser_download_url")
            if not name or not url:
                continue

            if name.endswith(".exe") and not installer_url:
                installer_url = url
            elif name.endswith(".sha256") and not installer_hash:
                installer_hash = _download_text(url)

        if context.is_docker:
            instructions = (
                "To update your Docker deployment:\n\n"
                "1. On your host machine, run:\n"
                "   .\\DOCKER.ps1 -UpdateClean\n\n"
                "2. This will:\n"
                "   - Pull the latest code\n"
                "   - Create an automatic backup\n"
                "   - Rebuild Docker image with latest fixes\n"
                "   - Restart the container\n\n"
                "3. The application will be available again shortly."
            )
            instructions_key = "maintenance.update.instructions_docker"
        else:
            release_label = "stable" if channel == "stable" else "preview/prerelease"
            instructions = (
                f"Update channel: {release_label}\n\n"
                "To update your native installation:\n\n"
                "1. Download the latest installer from:\n"
                f"   {installer_url}\n\n"
                "2. Run the installer to update your installation\n\n"
                "   - Or use 'Download & Install Now' in this tab for automatic in-place update\n\n"
                "3. Or if using source code:\n"
                "   git pull\n"
                "   .\\NATIVE.ps1 -Setup\n"
                "   .\\NATIVE.ps1 -Start"
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
        )


@router.post("/maintenance/updates/auto-install", response_model=OperationResult)
def auto_install_update(payload: AutoUpdateRequest, _request: Request, _auth=Depends(require_control_admin)):
    """Start background smart updater job (native Windows only)."""
    from backend.environment import get_runtime_context

    context = get_runtime_context()
    if context.is_docker:
        if _host_updater_bridge_enabled():
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
                message=(
                    "Docker host updater bridge accepted request. "
                    "Waiting for host watcher to execute DOCKER.ps1 -UpdateClean."
                ),
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
                    "Host updater bridge request queued. "
                    "The watcher service will run DOCKER.ps1 -UpdateClean on the host."
                ),
                message_key="maintenance.update.host_bridge_started",
                details={
                    "deployment_mode": "docker",
                    "mode": "docker_host_bridge",
                    "job_id": job_id,
                    "trigger_file": str(trigger_file),
                    "status_endpoint": f"/control/api/maintenance/updates/auto-install/{job_id}/status",
                    "watcher_hint": ".\\scripts\\update-watcher.ps1 -Start",
                },
            )

        return OperationResult(
            success=False,
            message=(
                "Automatic installer updates are not available in Docker mode because host bridge is disabled. "
                "Use .\\DOCKER.ps1 -UpdateClean or enable SMS_HOST_UPDATER_BRIDGE."
            ),
            message_key="maintenance.update.auto_install_docker_blocked",
            details={
                "deployment_mode": "docker",
                "bridge_enabled": False,
                "bridge_mode": os.environ.get("SMS_HOST_UPDATER_BRIDGE", "auto"),
            },
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
    _sync_job_from_host_updater_status(job_id)
    job = _get_auto_update_job(job_id)
    if not job:
        return AutoUpdateStatusResponse(
            job_id=job_id,
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
    version_file = Path(__file__).resolve().parents[3] / "VERSION"
    if version_file.exists():
        return version_file.read_text(encoding="utf-8").strip()
    return "1.0.0"


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
    if len(token) == 64 and all(c in "0123456789abcdefABCDEF" for c in token):
        return token
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
                }
            )
    else:
        # REST API output already contains browser_download_url
        for a in assets_in if isinstance(assets_in, list) else []:
            aname = a.get("name")
            dl = a.get("browser_download_url")
            if aname and dl:
                assets_out.append({"name": aname, "browser_download_url": dl})

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
