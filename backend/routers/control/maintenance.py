"""Maintenance and configuration management endpoints for Control Panel.

Provides admin interface for managing application settings, particularly
authentication and authorization policies.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()


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
    deployment_mode: Literal["docker", "native"] = Field(description="Detected deployment mode for localization")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


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

    auth_enabled = getattr(settings, "AUTH_ENABLED", False)
    auth_mode = getattr(settings, "AUTH_MODE", "disabled")

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
def check_for_updates(_request: Request):
    """Check for available updates from GitHub releases."""
    from backend.environment import get_runtime_context

    context = get_runtime_context()
    deployment_mode = "docker" if context.is_docker else "native"

    current_version = _get_version()

    try:
        latest_release = _fetch_github_latest_release()
        if not latest_release:
            return UpdateCheckResponse(
                current_version=current_version,
                latest_version=None,
                update_available=False,
                update_instructions="Could not check for updates. Please check manually at https://github.com/bs1gr/AUT_MIEEK_SMS/releases",
                update_instructions_key="maintenance.update.check_error",
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
            instructions = (
                "To update your native installation:\n\n"
                "1. Download the latest installer from:\n"
                f"   {installer_url}\n\n"
                "2. Run the installer to update your installation\n\n"
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
            deployment_mode=deployment_mode,
        )


def _get_version() -> str:
    """Read version from VERSION file or default."""
    version_file = Path(__file__).resolve().parents[3] / "VERSION"
    if version_file.exists():
        return version_file.read_text(encoding="utf-8").strip()
    return "1.0.0"


def _download_text(url: str) -> Optional[str]:
    try:
        import urllib.request

        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode("utf-8", errors="replace").strip()
    except Exception:
        return None


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


def _fetch_github_latest_release() -> Optional[Dict[str, Any]]:
    """Fetch latest release info from GitHub (gh CLI if available, otherwise REST)."""
    # 1) Try gh CLI (fast + supports auth automatically if configured)
    try:
        result = subprocess.run(
            ["gh", "release", "view", "--json", "tagName,name,body,htmlUrl,assets"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            raw = json.loads(result.stdout)
            return _normalize_release(raw)
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        logger.debug("gh CLI release fetch failed; falling back", extra={"error": str(exc)})

    # 2) Fallback to GitHub REST API
    try:
        import urllib.request

        url = "https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases/latest"
        with urllib.request.urlopen(url, timeout=10) as response:
            raw = json.loads(response.read().decode("utf-8", errors="replace"))
            return _normalize_release(raw)
    except Exception as exc:
        logger.debug("GitHub REST release fetch failed", extra={"error": str(exc)})
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
