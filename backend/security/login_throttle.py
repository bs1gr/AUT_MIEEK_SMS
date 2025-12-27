from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Dict, Optional

from backend.config import settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class _ThrottleState:
    attempts: int
    window_start: datetime
    lockout_until: Optional[datetime] = None


class LoginThrottle:
    """In-memory login throttle with per-identifier tracking."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._entries: Dict[str, _ThrottleState] = {}

    def _limits(self) -> tuple[int, timedelta, timedelta]:
        max_attempts = max(1, int(getattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 5)))
        window_seconds = max(1, int(getattr(settings, "AUTH_LOGIN_TRACKING_WINDOW_SECONDS", 300)))
        lockout_seconds = max(1, int(getattr(settings, "AUTH_LOGIN_LOCKOUT_SECONDS", 300)))
        return (
            max_attempts,
            timedelta(seconds=window_seconds),
            timedelta(seconds=lockout_seconds),
        )

    def get_lockout_until(self, key: str) -> Optional[datetime]:
        now = _now()
        with self._lock:
            state = self._entries.get(key)
            if not state or not state.lockout_until:
                return None
            if state.lockout_until <= now:
                # Lockout expired; reset state for future attempts
                state.lockout_until = None
                state.attempts = 0
                state.window_start = now
                return None
            return state.lockout_until

    def register_failure(self, key: str) -> Optional[datetime]:
        now = _now()
        max_attempts, window, lockout = self._limits()
        with self._lock:
            state = self._entries.get(key)
            if state is None or now - state.window_start > window:
                state = _ThrottleState(attempts=0, window_start=now)

            # If still locked, keep enforcing the lockout window
            if state.lockout_until and state.lockout_until > now:
                self._entries[key] = state
                return state.lockout_until

            if state.lockout_until and state.lockout_until <= now:
                state.lockout_until = None
                state.attempts = 0
                state.window_start = now

            state.attempts += 1
            if state.attempts >= max_attempts:
                state.lockout_until = now + lockout
                state.attempts = 0
                state.window_start = now

            self._entries[key] = state
            return state.lockout_until

    def reset(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


login_throttle = LoginThrottle()

__all__ = ["LoginThrottle", "login_throttle"]
