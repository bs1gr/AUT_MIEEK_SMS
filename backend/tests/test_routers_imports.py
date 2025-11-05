"""Tests for the imports router helpers."""

import asyncio

import pytest
from fastapi import UploadFile, HTTPException
from io import BytesIO
from starlette.datastructures import Headers


def _make_upload(filename: str, data: bytes, content_type: str | None) -> UploadFile:
    """Helper to construct UploadFile instances with the desired metadata."""

    headers = Headers({"content-type": content_type}) if content_type else None
    return UploadFile(BytesIO(data), filename=filename, headers=headers)

from backend.routers.routers_imports import validate_uploaded_file


def test_validate_uploaded_file_accepts_valid_json():
    """A well-formed JSON upload should pass validation."""
    upload = _make_upload("students.json", b"{\"students\": []}", "application/json")

    content = asyncio.run(validate_uploaded_file(upload))

    assert content == b"{\"students\": []}"


def test_validate_uploaded_file_rejects_bad_extension():
    """Files with forbidden extensions must be rejected before reading."""
    upload = _make_upload("payload.exe", b"{}", "application/json")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 400
    assert "Invalid file extension" in exc.value.detail


def test_validate_uploaded_file_rejects_bad_content_type():
    """Unexpected MIME types should be blocked even if the extension looks OK."""
    upload = _make_upload("students.json", b"{}", "application/xml")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 400
    assert "Invalid content type" in exc.value.detail


def test_validate_uploaded_file_rejects_empty_payload():
    """Zero-byte uploads should trigger an explicit validation error."""
    upload = _make_upload("students.json", b"", "application/json")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Uploaded file is empty"


def test_validate_uploaded_file_rejects_oversized_payload(monkeypatch):
    """Files larger than the configured limit must return HTTP 413."""
    monkeypatch.setattr("backend.routers.routers_imports.MAX_FILE_SIZE", 10)

    upload = _make_upload("students.json", b"{" + b"x" * 20 + b"}", "application/json")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 413
    assert "File too large" in exc.value.detail


def test_validate_uploaded_file_rejects_invalid_json():
    """Malformed JSON should surface as a clear validation failure."""
    upload = _make_upload("students.json", b"{invalid json}", "application/json")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 400
    assert "Invalid JSON format" in exc.value.detail


def test_validate_uploaded_file_rejects_invalid_encoding():
    """JSON uploads must use UTF-8 encoding; other encodings should fail."""
    upload = _make_upload("students.json", b"\xff\xfe\x00\x00", "application/json")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(validate_uploaded_file(upload))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid file encoding. JSON files must be UTF-8 encoded"
