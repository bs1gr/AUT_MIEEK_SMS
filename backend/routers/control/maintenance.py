"""Maintenance and configuration management endpoints for Control Panel.

Provides admin interface for managing application settings, particularly
authentication and authorization policies.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

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
