"""
Path validation and sanitization utilities for security.

Prevents path traversal attacks, directory escape, and other filesystem exploits.
"""

import re
from pathlib import Path
from typing import Union


def validate_filename(filename: str, allowed_extensions: list[str] = None) -> bool:
    """
    Validate a filename for safe filesystem usage.

    Args:
        filename: The filename to validate
        allowed_extensions: List of allowed file extensions (e.g., ['.db', '.enc', '.json'])
                          If None, all extensions allowed

    Returns:
        True if valid, raises ValueError otherwise

    Raises:
        ValueError: If filename contains invalid characters or patterns

    Examples:
        >>> validate_filename("backup_20260118.enc", [".enc"])
        True
        >>> validate_filename("../../../etc/passwd")
        ValueError: Path traversal detected
    """
    if not filename or not isinstance(filename, str):
        raise ValueError("Filename must be a non-empty string")

    # Check length (filesystem limit is typically 255 bytes)
    if len(filename) > 255:
        raise ValueError(f"Filename too long: {len(filename)} > 255 characters")

    # Check for path traversal patterns
    dangerous_patterns = [
        "..",  # Parent directory traversal
        "/",   # Unix path separator
        "\\",  # Windows path separator
        "\x00", # Null byte injection
        "~",   # Home directory expansion (some systems)
        "|",   # Pipe (command injection)
        "&",   # Command chaining
        ";",   # Command separator
        "$",   # Variable expansion
        "`",   # Command substitution
        "!",   # History expansion
        "*",   # Glob
        "?",   # Glob
    ]

    for pattern in dangerous_patterns:
        if pattern in filename:
            raise ValueError(f"Invalid character/pattern in filename: {pattern}")

    # Check for suspicious names (reserved on Windows)
    reserved_names = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
        "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3",
        "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", "CONIN$", "CONOUT$"
    ]
    base_name = filename.split(".")[0].upper()
    if base_name in reserved_names:
        raise ValueError(f"Reserved/system filename not allowed: {filename}")

    # Check file extension if specified
    if allowed_extensions:
        if not any(filename.endswith(ext) for ext in allowed_extensions):
            raise ValueError(
                f"File extension not allowed. Allowed: {', '.join(allowed_extensions)}, "
                f"got: {Path(filename).suffix}"
            )

    # Check for valid characters (alphanumeric, dash, underscore, dot)
    # Allow additional characters: parentheses, brackets, plus, equals
    if not re.match(r'^[a-zA-Z0-9._\-()[\]+= ]+$', filename):
        raise ValueError(f"Filename contains invalid characters: {filename}")

    return True


def sanitize_filename(filename: str, replacement: str = "_") -> str:
    """
    Sanitize a filename by replacing invalid characters.

    Args:
        filename: The filename to sanitize
        replacement: Character to replace invalid chars with (default: "_")

    Returns:
        Sanitized filename

    Examples:
        >>> sanitize_filename("backup/../../../etc/passwd")
        "backup________________etc_passwd"
    """
    if not filename:
        return "untitled"

    # Remove path separators and traversal attempts
    sanitized = filename.replace("..", replacement)
    sanitized = sanitized.replace("/", replacement)
    sanitized = sanitized.replace("\\", replacement)

    # Remove dangerous characters
    dangerous_chars = ["\x00", "|", "&", ";", "$", "`", "!", "~"]
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, replacement)

    # Remove leading/trailing spaces and dots
    sanitized = sanitized.strip(". ")

    # Limit length
    if len(sanitized) > 200:
        name, ext = Path(sanitized).stem, Path(sanitized).suffix
        sanitized = name[:195] + ext

    return sanitized if sanitized else "file"


def validate_path(base_dir: Union[str, Path], target_path: Union[str, Path]) -> bool:
    """
    Validate that a target path is within the base directory (prevent escape).

    Args:
        base_dir: The allowed base directory
        target_path: The target path to validate

    Returns:
        True if target is within base_dir, raises ValueError otherwise

    Raises:
        ValueError: If target path escapes base directory

    Examples:
        >>> validate_path("/backups", "/backups/2026_01_18.db")
        True
        >>> validate_path("/backups", "/etc/passwd")
        ValueError: Path escape detected
    """
    base = Path(base_dir).resolve()
    target = Path(target_path).resolve()

    try:
        # This will raise ValueError if target is not relative to base
        target.relative_to(base)
        return True
    except ValueError:
        raise ValueError(
            f"Path escape detected: {target} is not within {base}"
        )


class PathValidator:
    """Context manager for safe path operations."""

    def __init__(self, base_dir: Union[str, Path]):
        """Initialize with a base directory."""
        self.base_dir = Path(base_dir).resolve()
        if not self.base_dir.exists():
            raise ValueError(f"Base directory does not exist: {self.base_dir}")

    def validate_filename(self, filename: str, allowed_extensions: list[str] = None) -> str:
        """Validate filename and return it if valid."""
        validate_filename(filename, allowed_extensions)
        return filename

    def validate_path(self, relative_path: Union[str, Path]) -> Path:
        """Validate path is within base_dir and return full path."""
        full_path = self.base_dir / relative_path
        validate_path(self.base_dir, full_path)
        return full_path

    def get_safe_path(self, filename: str) -> Path:
        """Get a safe path for a filename within base_dir."""
        validate_filename(filename)
        return self.base_dir / filename

    def __enter__(self):
        """Support context manager protocol."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup."""
        pass


# Predefined validators for common use cases
BACKUP_FILENAME_VALIDATOR = lambda f: validate_filename(f, [".enc", ".db", ".backup"])
EXPORT_FILENAME_VALIDATOR = lambda f: validate_filename(f, [".csv", ".xlsx", ".json", ".pdf"])
CONFIG_FILENAME_VALIDATOR = lambda f: validate_filename(f, [".json", ".yml", ".yaml", ".toml"])
