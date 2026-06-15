"""Tests for the email/SMTP settings endpoints and smtp_override service."""
import json
import smtplib
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# smtp_override service unit tests
# ---------------------------------------------------------------------------


class TestSmtpOverrideService:
    def test_load_returns_empty_when_file_missing(self, tmp_path, monkeypatch):
        from backend.services import smtp_override

        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", tmp_path / "missing.json")
        assert smtp_override.load() == {}

    def test_load_returns_dict_when_file_exists(self, tmp_path, monkeypatch):
        from backend.services import smtp_override

        override_file = tmp_path / "smtp_override.json"
        override_file.write_text(json.dumps({"smtp_host": "smtp.test.com"}))
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)
        result = smtp_override.load()
        assert result["smtp_host"] == "smtp.test.com"

    def test_load_returns_empty_on_corrupt_file(self, tmp_path, monkeypatch):
        from backend.services import smtp_override

        override_file = tmp_path / "smtp_override.json"
        override_file.write_text("not-valid-json{{{{")
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)
        assert smtp_override.load() == {}

    def test_save_creates_file(self, tmp_path, monkeypatch):
        from backend.services import smtp_override

        override_file = tmp_path / "data" / "smtp_override.json"
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)
        smtp_override.save({"smtp_host": "smtp.example.com", "smtp_port": 465})
        assert override_file.exists()
        data = json.loads(override_file.read_text())
        assert data["smtp_host"] == "smtp.example.com"
        assert data["smtp_port"] == 465

    def test_apply_sets_settings_attributes(self, monkeypatch):
        from backend.services import smtp_override
        from backend.config import settings

        monkeypatch.setattr(settings, "SMTP_HOST", None, raising=False)
        monkeypatch.setattr(settings, "SMTP_PORT", 587, raising=False)
        monkeypatch.setattr(settings, "SMTP_USER", None, raising=False)
        monkeypatch.setattr(settings, "SMTP_PASSWORD", None, raising=False)
        monkeypatch.setattr(settings, "SMTP_FROM", None, raising=False)

        smtp_override.apply({
            "smtp_host": "mail.example.com",
            "smtp_port": "465",
            "smtp_username": "user@example.com",
            "smtp_password": "secret",
            "from_email": "noreply@example.com",
        })

        assert settings.SMTP_HOST == "mail.example.com"
        assert settings.SMTP_PORT == 465
        assert settings.SMTP_USER == "user@example.com"
        assert settings.SMTP_PASSWORD == "secret"
        assert settings.SMTP_FROM == "noreply@example.com"

    def test_apply_coerces_invalid_port_to_587(self, monkeypatch):
        from backend.services import smtp_override
        from backend.config import settings

        monkeypatch.setattr(settings, "SMTP_PORT", 587, raising=False)
        smtp_override.apply({"smtp_port": "not-a-number"})
        assert settings.SMTP_PORT == 587

    def test_apply_sets_none_for_empty_string(self, monkeypatch):
        from backend.services import smtp_override
        from backend.config import settings

        monkeypatch.setattr(settings, "SMTP_HOST", "previous", raising=False)
        smtp_override.apply({"smtp_host": ""})
        assert settings.SMTP_HOST is None

    def test_load_and_apply_returns_false_when_no_file(self, tmp_path, monkeypatch):
        from backend.services import smtp_override

        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", tmp_path / "missing.json")
        assert smtp_override.load_and_apply() is False

    def test_load_and_apply_returns_true_when_file_exists(self, tmp_path, monkeypatch):
        from backend.services import smtp_override
        from backend.config import settings

        override_file = tmp_path / "smtp_override.json"
        override_file.write_text(json.dumps({"smtp_host": "mx.test.com"}))
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)
        monkeypatch.setattr(settings, "SMTP_HOST", None, raising=False)

        result = smtp_override.load_and_apply()
        assert result is True
        assert settings.SMTP_HOST == "mx.test.com"


# ---------------------------------------------------------------------------
# Email settings API endpoint tests
# ---------------------------------------------------------------------------


class TestEmailSettingsEndpoints:
    BASE = "/api/v1/import-export/settings/email"

    def test_get_email_settings_returns_200(self, client: TestClient, admin_headers: dict):
        response = client.get(self.BASE, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "smtp_host" in data["data"]
        assert "smtp_port" in data["data"]
        assert "is_configured" in data["data"]

    def test_get_email_settings_masks_password(self, client: TestClient, admin_headers: dict, tmp_path, monkeypatch):
        from backend.services import smtp_override

        override_file = tmp_path / "smtp_override.json"
        override_file.write_text(json.dumps({"smtp_password": "supersecret"}))
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)

        response = client.get(self.BASE, headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["data"]["smtp_password"] == "••••••••"

    def test_update_email_settings_saves_and_applies(
        self, client: TestClient, admin_headers: dict, tmp_path, monkeypatch
    ):
        from backend.services import smtp_override
        from backend.config import settings

        override_file = tmp_path / "smtp_override.json"
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)
        monkeypatch.setattr(settings, "SMTP_HOST", None, raising=False)

        payload = {
            "smtp_host": "smtp.updated.com",
            "smtp_port": 587,
            "smtp_username": "user@updated.com",
            "smtp_password": "newpassword",
            "from_email": "noreply@updated.com",
        }
        response = client.put(self.BASE, json=payload, headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["data"]["saved"] is True

        # File should be persisted
        assert override_file.exists()
        saved = json.loads(override_file.read_text())
        assert saved["smtp_host"] == "smtp.updated.com"

        # In-memory settings should be updated
        assert settings.SMTP_HOST == "smtp.updated.com"

    def test_update_does_not_overwrite_password_placeholder(
        self, client: TestClient, admin_headers: dict, tmp_path, monkeypatch
    ):
        from backend.services import smtp_override

        override_file = tmp_path / "smtp_override.json"
        override_file.write_text(json.dumps({"smtp_password": "original"}))
        monkeypatch.setattr(smtp_override, "_SMTP_OVERRIDE_PATH", override_file)

        response = client.put(self.BASE, json={"smtp_password": "••••••••"}, headers=admin_headers)
        assert response.status_code == 200

        saved = json.loads(override_file.read_text())
        assert saved["smtp_password"] == "original"

    def test_test_email_requires_recipient(self, client: TestClient, admin_headers: dict):
        response = client.post(f"{self.BASE}/test", json={}, headers=admin_headers)
        assert response.status_code == 400

    def test_test_email_returns_400_when_not_configured(
        self, client: TestClient, admin_headers: dict
    ):
        with patch(
            "backend.services.email_notification_service.EmailNotificationService.is_enabled",
            return_value=False,
        ):
            response = client.post(
                f"{self.BASE}/test",
                json={"recipient_email": "test@example.com"},
                headers=admin_headers,
            )
        assert response.status_code == 400

    def test_test_email_sends_when_configured(self, client: TestClient, admin_headers: dict):
        with (
            patch(
                "backend.services.email_notification_service.EmailNotificationService.is_enabled",
                return_value=True,
            ),
            patch(
                "backend.services.email_notification_service.EmailNotificationService.send_email",
                return_value=True,
            ),
        ):
            response = client.post(
                f"{self.BASE}/test",
                json={"recipient_email": "test@example.com"},
                headers=admin_headers,
            )
        assert response.status_code == 200
        assert response.json()["data"]["success"] is True


# ---------------------------------------------------------------------------
# EmailNotificationService.send_email transport tests
# ---------------------------------------------------------------------------


class TestEmailTransport:
    """Unit tests for the SMTP transport logic (STARTTLS vs SSL branch)."""

    def _make_settings(self, monkeypatch, port: int = 587):
        from backend.config import settings

        monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com", raising=False)
        monkeypatch.setattr(settings, "SMTP_PORT", port, raising=False)
        monkeypatch.setattr(settings, "SMTP_USER", "user@example.com", raising=False)
        monkeypatch.setattr(settings, "SMTP_PASSWORD", "secret", raising=False)
        monkeypatch.setattr(settings, "SMTP_FROM", "noreply@example.com", raising=False)

    def test_port_587_uses_starttls(self, monkeypatch):
        self._make_settings(monkeypatch, port=587)
        from backend.services.email_notification_service import EmailNotificationService

        mock_server = MagicMock()
        with patch("smtplib.SMTP", return_value=mock_server) as mock_smtp:
            mock_smtp.return_value.__enter__ = lambda s: mock_server
            mock_smtp.return_value.__exit__ = MagicMock(return_value=False)
            EmailNotificationService.send_email("to@example.com", "Subj", "<p>body</p>")

        mock_smtp.assert_called_once_with("smtp.example.com", 587, timeout=30)
        mock_server.ehlo.assert_called()
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user@example.com", "secret")

    def test_port_465_uses_smtp_ssl(self, monkeypatch):
        self._make_settings(monkeypatch, port=465)
        from backend.services.email_notification_service import EmailNotificationService

        mock_server = MagicMock()
        with patch("smtplib.SMTP_SSL", return_value=mock_server) as mock_ssl:
            mock_ssl.return_value.__enter__ = lambda s: mock_server
            mock_ssl.return_value.__exit__ = MagicMock(return_value=False)
            with patch("smtplib.SMTP") as mock_plain:
                EmailNotificationService.send_email("to@example.com", "Subj", "<p>body</p>")
                mock_plain.assert_not_called()

        mock_ssl.assert_called_once_with("smtp.example.com", 465, timeout=30)
        mock_server.starttls.assert_not_called()
        mock_server.login.assert_called_once_with("user@example.com", "secret")
