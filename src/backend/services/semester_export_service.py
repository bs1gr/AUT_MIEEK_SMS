"""Durable, encrypted export of a semester's full dataset.

Builds the same JSON payload as the GET /api/v1/sessions/export endpoint
(via session_data_service.build_semester_export_payload) and persists it as
an AES-256-GCM encrypted artifact under backups/semester_archives/, reusing
BackupServiceEncrypted (the same encryption/backup machinery the control
panel's database backups use) rather than duplicating path-validation or
encryption logic.
"""

import json
import os
import re
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.services.backup_service_encrypted import BackupServiceEncrypted
from backend.services.session_data_service import build_semester_export_payload

SEMESTER_ARCHIVE_DIR = Path(__file__).resolve().parents[2] / "backups" / "semester_archives"
# Plaintext staging directory for the export JSON before it's encrypted.
# Kept alongside the (already access-controlled) backups tree instead of the
# shared OS temp dir, since the plaintext payload contains student PII/grades.
_STAGING_DIR = SEMESTER_ARCHIVE_DIR / ".staging"


def _slugify_semester(semester: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "_", semester).strip("_")
    return slug or "semester"


class SemesterExportService:
    """Builds and persists an encrypted export for one semester archive run."""

    def __init__(self, db: Session, backup_dir: Optional[Path] = None) -> None:
        self.db = db
        self.backup_service = BackupServiceEncrypted(backup_dir=backup_dir or SEMESTER_ARCHIVE_DIR)

    def create_export(self, semester: str, pass_threshold: float) -> Dict[str, Any]:
        """Build the semester's export payload and persist it as an encrypted
        artifact. Returns backup info including `backup_name` (filename stem)
        and `backup_path`. Raises on failure (caller decides how to record it)."""
        payload = build_semester_export_payload(self.db, semester)
        payload["metadata"]["pass_threshold"] = pass_threshold
        payload["metadata"]["export_purpose"] = "semester_archive"

        json_str = json.dumps(payload, indent=2, ensure_ascii=False, default=str)

        _STAGING_DIR.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(_STAGING_DIR, stat.S_IRWXU)  # 0700: owner-only, no-op on Windows
        except OSError:
            pass
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8", dir=_STAGING_DIR
        ) as tmp:
            tmp.write(json_str)
            tmp_path = Path(tmp.name)
        try:
            os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)  # 0600: owner-only, no-op on Windows
        except OSError:
            pass

        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"semester_archive_{_slugify_semester(semester)}_{timestamp}"
            result = self.backup_service.create_encrypted_backup(
                source_path=tmp_path,
                backup_name=backup_name,
                metadata={"semester": semester, "counts": payload["metadata"]["counts"]},
            )
            return result
        finally:
            tmp_path.unlink(missing_ok=True)
