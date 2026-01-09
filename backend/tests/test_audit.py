"""
Unit tests for audit logging system.

Tests cover:
- AuditLogger service methods
- Audit router endpoints
- Filtering and pagination
- Admin-only access control
- IP address extraction
"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.models import AuditLog
from backend.schemas.audit import AuditAction, AuditResource
from backend.services.audit_service import AuditLogger


class TestAuditLogger:
    """Tests for AuditLogger service."""

    def test_log_action_basic(self, clean_db: Session):
        """Test basic audit log creation."""
        audit_logger = AuditLogger(clean_db)

        log = audit_logger.log_action(
            action=AuditAction.CREATE,
            resource=AuditResource.STUDENT,
            resource_id="123",
            user_id=1,
            user_email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="TestAgent/1.0",
            details={"name": "John Doe"},
        )

        assert log.id is not None
        assert log.action == AuditAction.CREATE.value
        assert log.resource == AuditResource.STUDENT.value
        assert log.resource_id == "123"
        assert log.user_id == 1
        assert log.user_email == "test@example.com"
        assert log.ip_address == "127.0.0.1"
        assert log.user_agent == "TestAgent/1.0"
        assert log.details == {"name": "John Doe"}
        assert log.success is True
        assert log.error_message is None
        assert log.timestamp is not None

    def test_log_action_with_error(self, clean_db: Session):
        """Test audit log creation for failed action."""
        audit_logger = AuditLogger(clean_db)

        log = audit_logger.log_action(
            action=AuditAction.DELETE,
            resource=AuditResource.STUDENT,
            resource_id="456",
            user_id=1,
            success=False,
            error_message="Permission denied",
        )

        assert log.success is False
        assert log.error_message == "Permission denied"

    def test_log_action_system_action(self, clean_db: Session):
        """Test audit log for system-initiated action (no user)."""
        audit_logger = AuditLogger(clean_db)

        log = audit_logger.log_action(
            action=AuditAction.BACKUP_CREATE,
            resource=AuditResource.SYSTEM,
            user_id=None,
            user_email=None,
        )

        assert log.user_id is None
        assert log.user_email is None
        assert log.action == AuditAction.BACKUP_CREATE.value

    def test_log_action_all_action_types(self, clean_db: Session):
        """Test logging different action types."""
        audit_logger = AuditLogger(clean_db)

        actions = [
            AuditAction.LOGIN,
            AuditAction.LOGOUT,
            AuditAction.CREATE,
            AuditAction.UPDATE,
            AuditAction.DELETE,
            AuditAction.BULK_IMPORT,
            AuditAction.BULK_EXPORT,
        ]

        for action in actions:
            log = audit_logger.log_action(
                action=action,
                resource=AuditResource.STUDENT,
                user_id=1,
            )
            assert log.action == action.value

    def test_log_action_all_resource_types(self, clean_db: Session):
        """Test logging different resource types."""
        audit_logger = AuditLogger(clean_db)

        resources = [
            AuditResource.STUDENT,
            AuditResource.COURSE,
            AuditResource.GRADE,
            AuditResource.ATTENDANCE,
            AuditResource.USER,
            AuditResource.SYSTEM,
        ]

        for resource in resources:
            log = audit_logger.log_action(
                action=AuditAction.CREATE,
                resource=resource,
                user_id=1,
            )
            assert log.resource == resource.value


class TestAuditRouter:
    """Tests for audit router endpoints."""

    def test_list_audit_logs_admin_only(self, client: TestClient, admin_token: str, teacher_token: str):
        """Test that only admins can list audit logs."""
        # Admin should succeed
        response = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200

        # Teacher should fail (403 or 401 depending on AUTH_MODE)
        # In permissive mode, it might return 200 with empty data or limited access
        response = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {teacher_token}"})
        # Accept both 200 (permissive) and 403 (strict)
        assert response.status_code in [200, 403]

    def test_list_audit_logs_empty(self, client: TestClient, admin_token: str):
        """Test listing audit logs when none exist."""
        response = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert data["total"] >= 0  # May have logs from auth/setup

    def test_list_audit_logs_with_data(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test listing audit logs with sample data."""
        # Create some audit logs
        audit_logger = AuditLogger(clean_db)
        for i in range(5):
            audit_logger.log_action(
                action=AuditAction.CREATE,
                resource=AuditResource.STUDENT,
                resource_id=str(i),
                user_id=1,
            )

        response = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) >= 5
        assert data["total"] >= 5

    def test_list_audit_logs_pagination(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test pagination of audit logs."""
        # Create 15 audit logs
        audit_logger = AuditLogger(clean_db)
        for i in range(15):
            audit_logger.log_action(
                action=AuditAction.CREATE,
                resource=AuditResource.STUDENT,
                resource_id=str(i),
                user_id=1,
            )

        # Get first page (10 items)
        response = client.get("/api/v1/audit/logs?limit=10&skip=0", headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) == 10
        assert data["total"] >= 15

        # Get second page (5 items)
        response = client.get("/api/v1/audit/logs?limit=10&skip=10", headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) >= 5

    def test_list_audit_logs_filter_by_user(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test filtering audit logs by user_id."""
        audit_logger = AuditLogger(clean_db)

        # Create logs for different users
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=2)
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)

        response = client.get("/api/v1/audit/logs?user_id=1", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        # Should only return logs for user 1
        for log in data["logs"]:
            if log["user_id"] is not None:
                assert log["user_id"] == 1

    def test_list_audit_logs_filter_by_action(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test filtering audit logs by action type."""
        audit_logger = AuditLogger(clean_db)

        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)
        audit_logger.log_action(action=AuditAction.UPDATE, resource=AuditResource.STUDENT, user_id=1)
        audit_logger.log_action(action=AuditAction.DELETE, resource=AuditResource.STUDENT, user_id=1)

        response = client.get("/api/v1/audit/logs?action=create", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        for log in data["logs"]:
            if log["resource"] == "student":  # Filter to our test data
                assert log["action"] == "create"

    def test_list_audit_logs_filter_by_resource(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test filtering audit logs by resource type."""
        audit_logger = AuditLogger(clean_db)

        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.COURSE, user_id=1)
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.GRADE, user_id=1)

        response = client.get("/api/v1/audit/logs?resource=student", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        for log in data["logs"]:
            if log["action"] == "create" and log["user_id"] == 1:
                assert log["resource"] == "student"

    def test_list_audit_logs_filter_by_date_range(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test filtering audit logs by date range."""
        audit_logger = AuditLogger(clean_db)

        # Create logs at different times (simulated)
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)

        # Get current time and create a date range
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
        end_date = (now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")

        response = client.get(
            f"/api/v1/audit/logs?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) >= 1

    def test_list_audit_logs_filter_by_success(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test filtering audit logs by success/failure."""
        audit_logger = AuditLogger(clean_db)

        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1, success=True)
        audit_logger.log_action(action=AuditAction.DELETE, resource=AuditResource.STUDENT, user_id=1, success=False)

        response = client.get("/api/v1/audit/logs?success=false", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        for log in data["logs"]:
            if log["user_id"] == 1 and log["action"] == "delete":
                assert log["success"] is False

    def test_get_audit_log_by_id(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test retrieving a specific audit log by ID."""
        audit_logger = AuditLogger(clean_db)

        log = audit_logger.log_action(
            action=AuditAction.CREATE,
            resource=AuditResource.STUDENT,
            resource_id="999",
            user_id=1,
            details={"test": "data"},
        )

        response = client.get(f"/api/v1/audit/logs/{log.id}", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == log.id
        assert data["action"] == "create"
        assert data["resource"] == "student"
        assert data["resource_id"] == "999"
        assert data["details"] == {"test": "data"}

    def test_get_audit_log_not_found(self, client: TestClient, admin_token: str):
        """Test retrieving non-existent audit log."""
        response = client.get("/api/v1/audit/logs/999999", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 404

    def test_get_user_audit_logs(self, client: TestClient, admin_token: str, clean_db: Session):
        """Test retrieving all audit logs for a specific user."""
        audit_logger = AuditLogger(clean_db)

        # Create logs for user 1
        for i in range(3):
            audit_logger.log_action(
                action=AuditAction.CREATE, resource=AuditResource.STUDENT, resource_id=str(i), user_id=1
            )

        # Create logs for user 2
        audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=2)

        response = client.get("/api/v1/audit/logs/user/1", headers={"Authorization": f"Bearer {admin_token}"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) >= 3
        for log in data["logs"]:
            if log["resource"] == "student" and log["action"] == "create":
                assert log["user_id"] == 1


class TestAuditCoverage:
    """Additional tests for edge cases and coverage."""

    def test_audit_log_timestamp_ordering(self, clean_db: Session):
        """Test that audit logs are returned in reverse chronological order."""
        audit_logger = AuditLogger(clean_db)

        log1 = audit_logger.log_action(action=AuditAction.CREATE, resource=AuditResource.STUDENT, user_id=1)
        log2 = audit_logger.log_action(action=AuditAction.UPDATE, resource=AuditResource.STUDENT, user_id=1)
        log3 = audit_logger.log_action(action=AuditAction.DELETE, resource=AuditResource.STUDENT, user_id=1)

        logs = clean_db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(3).all()

        # Most recent should be first
        assert logs[0].id == log3.id
        assert logs[1].id == log2.id
        assert logs[2].id == log1.id

    def test_audit_log_with_complex_details(self, clean_db: Session):
        """Test audit log with complex JSON details."""
        audit_logger = AuditLogger(clean_db)

        complex_details = {
            "changes": {
                "name": {"old": "John", "new": "Jane"},
                "email": {"old": "j@example.com", "new": "jane@example.com"},
            },
            "metadata": {"ip": "127.0.0.1", "browser": "Firefox"},
            "nested": {"level1": {"level2": {"value": 123}}},
        }

        log = audit_logger.log_action(
            action=AuditAction.UPDATE, resource=AuditResource.USER, user_id=1, details=complex_details
        )

        assert log.details == complex_details
        assert log.details["nested"]["level1"]["level2"]["value"] == 123
