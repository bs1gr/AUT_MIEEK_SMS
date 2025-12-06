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
    auth_mode: Literal["disabled", "permissive", "strict"] = Field(
        description="Authorization enforcement mode"
    )
    auth_login_max_attempts: int = Field(description="Max login attempts before lockout")
    auth_login_lockout_seconds: int = Field(description="Lockout duration in seconds")
    auth_login_tracking_window_seconds: int = Field(description="Time window for tracking attempts")
    source: str = Field(description="Configuration source (env, .env file, defaults)")
    effective_policy: str = Field(description="Human-readable policy description")


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
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


def _get_policy_description(enabled: bool, mode: str) -> str:
    """Generate human-readable policy description."""
    if not enabled:
        return "🔓 No authentication required (all endpoints public)"

    if mode == "disabled":
        return "🔓 No authentication required (all endpoints public)"
    elif mode == "permissive":
        return "🔐 Authentication required, but all authenticated users have full access (recommended)"
    elif mode == "strict":
        return "🔒 Full role-based access control (admin/teacher roles strictly enforced)"
    else:
        return f"⚠️ Unknown mode: {mode}"


@router.get("/maintenance/auth-settings", response_model=AuthSettingsResponse)
async def get_auth_settings(request: Request):
    """Get current authentication and authorization settings.
    
    Returns the effective configuration including AUTH_ENABLED and AUTH_MODE.
    """
    from backend.config import settings

    # Determine source
    source = "defaults"
    backend_env = Path(__file__).resolve().parents[3] / "backend" / ".env"
    root_env = Path(__file__).resolve().parents[3] / ".env"

    if backend_env.exists():
        source = "backend/.env"
    elif root_env.exists():
        source = ".env"
    elif any(k.startswith("AUTH_") for k in os.environ):
        source = "environment variables"

    auth_enabled = getattr(settings, "AUTH_ENABLED", False)
    auth_mode = getattr(settings, "AUTH_MODE", "disabled")

    return AuthSettingsResponse(
        auth_enabled=auth_enabled,
        auth_mode=auth_mode,
        auth_login_max_attempts=getattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 5),
        auth_login_lockout_seconds=getattr(settings, "AUTH_LOGIN_LOCKOUT_SECONDS", 300),
        auth_login_tracking_window_seconds=getattr(settings, "AUTH_LOGIN_TRACKING_WINDOW_SECONDS", 300),
        source=source,
        effective_policy=_get_policy_description(auth_enabled, auth_mode)
    )


@router.post("/maintenance/auth-settings", response_model=OperationResult)
async def update_auth_settings(payload: AuthSettingsUpdate, request: Request):
    """Update authentication settings by modifying .env file.
    
    ⚠️ Requires application restart to take effect.
    
    Supports:
    - AUTH_ENABLED: Master authentication switch
    - AUTH_MODE: Authorization enforcement level (disabled/permissive/strict)
    - AUTH_LOGIN_MAX_ATTEMPTS: Login attempt limit
    - AUTH_LOGIN_LOCKOUT_SECONDS: Lockout duration
    """
    try:
        # Find .env file (prefer backend/.env, fallback to root .env)
        project_root = Path(__file__).resolve().parents[3]
        backend_env = project_root / "backend" / ".env"
        root_env = project_root / ".env"

        env_file = backend_env if backend_env.exists() else root_env

        if not env_file.exists():
            # Create from .env.example if available
            example_file = env_file.parent / ".env.example"
            if example_file.exists():
                env_file.write_text(example_file.read_text(encoding="utf-8"), encoding="utf-8")
            else:
                return OperationResult(
                    success=False,
                    message="No .env file found and no .env.example to copy from",
                    details={"expected_path": str(env_file)}
                )

        # Read current .env
        lines = env_file.read_text(encoding="utf-8").splitlines()
        updated_lines = []
        updated_keys = set()

        # Update existing keys
        for line in lines:
            stripped = line.strip()

            # Update AUTH_ENABLED
            if payload.auth_enabled is not None and stripped.startswith("AUTH_ENABLED="):
                updated_lines.append(f"AUTH_ENABLED={str(payload.auth_enabled).lower()}")
                updated_keys.add("AUTH_ENABLED")

            # Update AUTH_MODE
            elif payload.auth_mode is not None and stripped.startswith("AUTH_MODE="):
                updated_lines.append(f"AUTH_MODE={payload.auth_mode}")
                updated_keys.add("AUTH_MODE")

            # Update AUTH_LOGIN_MAX_ATTEMPTS
            elif payload.auth_login_max_attempts is not None and stripped.startswith("AUTH_LOGIN_MAX_ATTEMPTS="):
                updated_lines.append(f"AUTH_LOGIN_MAX_ATTEMPTS={payload.auth_login_max_attempts}")
                updated_keys.add("AUTH_LOGIN_MAX_ATTEMPTS")

            # Update AUTH_LOGIN_LOCKOUT_SECONDS
            elif payload.auth_login_lockout_seconds is not None and stripped.startswith("AUTH_LOGIN_LOCKOUT_SECONDS="):
                updated_lines.append(f"AUTH_LOGIN_LOCKOUT_SECONDS={payload.auth_login_lockout_seconds}")
                updated_keys.add("AUTH_LOGIN_LOCKOUT_SECONDS")

            else:
                updated_lines.append(line)

        # Append missing keys at the end (after AUTH section if present)
        new_keys = []
        if payload.auth_enabled is not None and "AUTH_ENABLED" not in updated_keys:
            new_keys.append(f"AUTH_ENABLED={str(payload.auth_enabled).lower()}")

        if payload.auth_mode is not None and "AUTH_MODE" not in updated_keys:
            new_keys.append(f"AUTH_MODE={payload.auth_mode}")

        if payload.auth_login_max_attempts is not None and "AUTH_LOGIN_MAX_ATTEMPTS" not in updated_keys:
            new_keys.append(f"AUTH_LOGIN_MAX_ATTEMPTS={payload.auth_login_max_attempts}")

        if payload.auth_login_lockout_seconds is not None and "AUTH_LOGIN_LOCKOUT_SECONDS" not in updated_keys:
            new_keys.append(f"AUTH_LOGIN_LOCKOUT_SECONDS={payload.auth_login_lockout_seconds}")

        # Find AUTH section and insert new keys there
        if new_keys:
            auth_section_idx = -1
            for i, line in enumerate(updated_lines):
                if "AUTHENTICATION" in line and line.strip().startswith("#"):
                    auth_section_idx = i
                    break

            if auth_section_idx >= 0:
                # Find end of auth section (next section or EOF)
                insert_idx = auth_section_idx + 1
                for i in range(auth_section_idx + 1, len(updated_lines)):
                    if updated_lines[i].strip().startswith("# ==="):
                        insert_idx = i
                        break
                else:
                    insert_idx = len(updated_lines)

                # Insert new keys
                for key in reversed(new_keys):
                    updated_lines.insert(insert_idx, key)
            else:
                # No AUTH section found, append at end
                if updated_lines and not updated_lines[-1].strip():
                    updated_lines.extend(new_keys)
                else:
                    updated_lines.append("")
                    updated_lines.extend(new_keys)

        # Write updated .env
        env_file.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")

        # Get new effective policy
        from backend.config import get_settings
        settings = get_settings()
        effective_auth_enabled = payload.auth_enabled if payload.auth_enabled is not None else getattr(settings, "AUTH_ENABLED", False)
        effective_auth_mode = payload.auth_mode if payload.auth_mode is not None else getattr(settings, "AUTH_MODE", "disabled")

        updated_values = {}
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
            details={
                "file": str(env_file),
                "updated_values": updated_values,
                "effective_policy": _get_policy_description(effective_auth_enabled, effective_auth_mode),
                "requires_restart": True
            }
        )

    except Exception as e:
        return OperationResult(
            success=False,
            message=f"Failed to update authentication settings: {str(e)}",
            details={"error": str(e), "type": type(e).__name__}
        )


@router.get("/maintenance/auth-policy-guide")
async def get_auth_policy_guide():
    """Get detailed guide on authentication policies.
    
    Returns comprehensive documentation on AUTH_MODE options.
    """
    return {
        "policies": {
            "disabled": {
                "description": "No authentication required",
                "use_case": "Development, testing, or fully public systems",
                "security_level": "None",
                "behavior": "All endpoints accessible without login",
                "icon": "🔓"
            },
            "permissive": {
                "description": "Authentication required, but all authenticated users have full access",
                "use_case": "Production systems where all users are trusted (recommended)",
                "security_level": "Medium",
                "behavior": "Users must login, but can access all endpoints regardless of role",
                "icon": "🔐",
                "recommended": True
            },
            "strict": {
                "description": "Full role-based access control (RBAC)",
                "use_case": "High-security environments with distinct admin/teacher/student roles",
                "security_level": "High",
                "behavior": "Endpoints check user roles, deny access if role doesn't match",
                "icon": "🔒"
            }
        },
        "settings": {
            "AUTH_ENABLED": {
                "type": "boolean",
                "default": False,
                "description": "Master authentication switch. If false, overrides AUTH_MODE."
            },
            "AUTH_MODE": {
                "type": "string",
                "default": "disabled",
                "options": ["disabled", "permissive", "strict"],
                "description": "Authorization enforcement level"
            },
            "AUTH_LOGIN_MAX_ATTEMPTS": {
                "type": "integer",
                "default": 5,
                "range": "1-100",
                "description": "Maximum failed login attempts before account lockout"
            },
            "AUTH_LOGIN_LOCKOUT_SECONDS": {
                "type": "integer",
                "default": 300,
                "range": "0-3600",
                "description": "Account lockout duration in seconds (300 = 5 minutes)"
            }
        },
        "examples": {
            "development": {
                "AUTH_ENABLED": False,
                "AUTH_MODE": "disabled",
                "description": "No authentication for quick development"
            },
            "production_recommended": {
                "AUTH_ENABLED": True,
                "AUTH_MODE": "permissive",
                "description": "Users must login but no role restrictions"
            },
            "high_security": {
                "AUTH_ENABLED": True,
                "AUTH_MODE": "strict",
                "description": "Full RBAC with role enforcement"
            }
        }
    }


@router.get("/maintenance/updates/check", response_model=UpdateCheckResponse)
async def check_for_updates(request: Request):
    """Check for available updates from GitHub releases.
    
    Compares current version with latest GitHub release and provides
    update instructions for Docker deployments.
    """
    from backend.environment import get_runtime_context
    
    current_version = _get_version()
    
    try:
        # Fetch latest release from GitHub
        latest_release = _fetch_github_latest_release()
        
        if not latest_release:
            return UpdateCheckResponse(
                current_version=current_version,
                latest_version=None,
                update_available=False,
                update_instructions="Could not check for updates. Please check manually at https://github.com/bs1gr/AUT_MIEEK_SMS/releases"
            )
        
        latest_version = latest_release.get("tag_name", "").lstrip("v")
        update_available = _version_is_newer(latest_version, current_version)
        
        # Extract assets (installer, hash, etc.)
        assets = latest_release.get("assets", [])
        installer_url = None
        installer_hash = None
        
        for asset in assets:
            if asset["name"].endswith(".exe"):
                installer_url = asset["browser_download_url"]
            elif asset["name"].endswith(".sha256"):
                installer_hash = _fetch_github_file_content(asset["url"])
        
        # Determine instructions based on deployment type
        context = get_runtime_context()
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
        
        return UpdateCheckResponse(
            current_version=current_version,
            latest_version=latest_version,
            update_available=update_available,
            release_url=latest_release.get("html_url"),
            release_name=latest_release.get("name"),
            release_body=latest_release.get("body"),
            installer_url=installer_url,
            installer_hash=installer_hash,
            docker_image_url="https://github.com/bs1gr/AUT_MIEEK_SMS/pkgs/container/sms-backend",
            update_instructions=instructions
        )
        
    except Exception as exc:
        logger.error("Error checking for updates: %s", exc, exc_info=True)
        return UpdateCheckResponse(
            current_version=current_version,
            latest_version=None,
            update_available=False,
            update_instructions=f"Error checking for updates: {str(exc)}. Please check manually at https://github.com/bs1gr/AUT_MIEEK_SMS/releases"
        )


def _get_version() -> str:
    """Read version from VERSION file or default."""
    version_file = Path(__file__).resolve().parents[3] / "VERSION"
    if version_file.exists():
        return version_file.read_text(encoding="utf-8").strip()
    return "1.0.0"


def _fetch_github_latest_release() -> Optional[Dict[str, Any]]:
    """Fetch latest release info from GitHub API."""
    try:
        # Use gh CLI if available
        result = subprocess.run(
            ["gh", "release", "view", "--json", "tagName,name,body,htmlUrl,assets"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        pass
    
    # Fallback to direct API call
    try:
        import urllib.request
        url = "https://api.github.com/repos/bs1gr/AUT_MIEEK_SMS/releases/latest"
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception:
        return None


def _fetch_github_file_content(asset_url: str) -> Optional[str]:
    """Fetch file content from GitHub release asset."""
    try:
        import urllib.request
        headers = {"Accept": "application/octet-stream"}
        req = urllib.request.Request(asset_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.read().decode().strip()
    except Exception:
        return None


def _version_is_newer(latest: str, current: str) -> bool:
    """Compare semantic versions. Returns True if latest > current."""
    try:
        def parse_version(v: str) -> tuple:
            """Parse version string into tuple of ints."""
            parts = v.lstrip("v").split(".")
            return tuple(int(p) for p in parts[:3])  # Compare major.minor.patch
        
        return parse_version(latest) > parse_version(current)
    except (ValueError, IndexError):
        return False
