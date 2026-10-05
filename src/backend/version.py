"""The application version: the single source is the VERSION file at the project root."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def get_version() -> str:
    """Read version from the VERSION file at the project root.

    Checked at multiple ancestor depths because this module lives at a
    different depth relative to VERSION depending on deployment layout:
    three levels up in the native/source checkout (src/backend/ -> repo
    root), but only one level up in the Docker image (/app/backend/ ->
    /app/, since Dockerfile.fullstack copies VERSION to /app/VERSION
    alongside /app/backend rather than mirroring the full src/ tree).
    In the frozen Lite build the ancestors are _internal/backend and _internal.
    """
    try:
        here = Path(__file__).resolve()
        for ancestor in (here.parent, here.parent.parent, here.parent.parent.parent):
            version_file = ancestor / "VERSION"
            if version_file.exists():
                return version_file.read_text().strip()
    except Exception:
        pass
    return "unknown"
