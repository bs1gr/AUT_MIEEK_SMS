"""
Rate Limiting Configuration Manager
Provides persistent storage and runtime adjustment of rate limits for administrators.
"""

import json
from pathlib import Path
from typing import Optional, Dict

# Configuration file location
_CONFIG_DIR = Path(__file__).parent / "config"
_RATE_LIMIT_CONFIG_FILE = _CONFIG_DIR / "rate_limits.json"


class RateLimitConfig:
    """Manages rate limit configuration with persistence."""

    # Default values (in requests per minute)
    DEFAULTS = {
        "read": 1000,
        "write": 500,
        "heavy": 200,
        "auth": 120,  # 2 per second - reasonable for login attempts
        "teacher_import": 5000,
    }

    def __init__(self):
        """Initialize configuration, loading from file if available."""
        self._config = self.DEFAULTS.copy()
        self._load_from_file()

    def _ensure_config_dir(self):
        """Create config directory if it doesn't exist."""
        _CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    def _load_from_file(self):
        """Load configuration from persistent file."""
        try:
            if _RATE_LIMIT_CONFIG_FILE.exists():
                with open(_RATE_LIMIT_CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    # Validate and merge with defaults
                    for key in self.DEFAULTS:
                        if key in data:
                            self._config[key] = max(1, int(data[key]))  # Ensure min 1
        except Exception as e:
            print(f"[RateLimitConfig] Failed to load config file: {e}")
            self._config = self.DEFAULTS.copy()

    def _save_to_file(self):
        """Persist configuration to file."""
        try:
            self._ensure_config_dir()
            with open(_RATE_LIMIT_CONFIG_FILE, "w") as f:
                json.dump(self._config, f, indent=2)
        except Exception as e:
            print(f"[RateLimitConfig] Failed to save config file: {e}")

    def get(self, limit_type: str) -> int:
        """Get rate limit for a specific type."""
        return self._config.get(limit_type, self.DEFAULTS.get(limit_type, 100))

    def set(self, limit_type: str, value: int) -> bool:
        """Set rate limit for a specific type (admin only)."""
        if limit_type not in self.DEFAULTS:
            return False
        if value < 1:
            return False
        self._config[limit_type] = value
        self._save_to_file()
        return True

    def set_multiple(self, limits: Dict[str, int]) -> Dict[str, bool]:
        """Set multiple limits at once, returning success status for each."""
        results = {}
        for limit_type, value in limits.items():
            results[limit_type] = self.set(limit_type, value)
        return results

    def reset_to_defaults(self) -> bool:
        """Reset all limits to defaults."""
        self._config = self.DEFAULTS.copy()
        self._save_to_file()
        return True

    def get_all(self) -> Dict[str, int]:
        """Get all current limits."""
        return self._config.copy()

    def get_defaults(self) -> Dict[str, int]:
        """Get default limits."""
        return self.DEFAULTS.copy()


# Global singleton instance
_instance: Optional[RateLimitConfig] = None


def get_rate_limit_config() -> RateLimitConfig:
    """Get or create the global rate limit configuration instance."""
    global _instance
    if _instance is None:
        _instance = RateLimitConfig()
    return _instance
