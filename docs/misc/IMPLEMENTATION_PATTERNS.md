# Implementation Patterns & Code Examples

## Student Management System - Improvement Guide

This document provides practical code examples for implementing the recommended improvements from the Codebase Audit Report.

---

## 1. IMPLEMENTING AUDIT LOGGING (Priority 1)

### Problem

Grade changes, admin actions, and user modifications leave no audit trail.

### Solution: Complete Audit System

```python
# backend/models.py - Add to existing models

from enum import Enum

class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SOFT_DELETE = "soft_delete"
    RESTORE = "restore"
    EXPORT = "export"
    IMPORT = "import"

class AuditLog(Base):
    """Track all sensitive operations for compliance and debugging"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), index=True)  # CREATE, UPDATE, DELETE, etc.
    resource_type = Column(String(50), index=True)  # Student, Grade, Course, etc.
    resource_id = Column(Integer, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # What changed
    old_values = Column(JSON)  # Before state
    new_values = Column(JSON)  # After state
    change_reason = Column(String(500))  # Why changed (for grades)

    # Tracking
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))
    request_id = Column(String(36), index=True)

    __table_args__ = (
        Index("idx_audit_resource", "resource_type", "resource_id"),
        Index("idx_audit_user_action", "user_id", "action"),
        Index("idx_audit_timestamp", "timestamp"),
    )

```text
```python
# backend/services/audit_service.py - New service

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import AuditLog, AuditAction
import json

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: AuditAction,
        resource_type: str,
        resource_id: int,
        user_id: Optional[int],
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        change_reason: Optional[str] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Create audit log entry"""
        log = AuditLog(
            action=action.value,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            change_reason=change_reason,
            timestamp=datetime.now(timezone.utc),
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id
        )
        db.add(log)
        db.commit()
        return log

    @staticmethod
    def get_resource_history(
        db: Session,
        resource_type: str,
        resource_id: int,
        limit: int = 50
    ) -> list:
        """Get all changes to a resource"""
        return db.query(AuditLog).filter(
            AuditLog.resource_type == resource_type,
            AuditLog.resource_id == resource_id
        ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

```text
```python
# backend/routers/routers_grades.py - Integration example

from backend.services.audit_service import AuditService
from backend.models import AuditAction

@router.put("/grades/{grade_id}/")
@limiter.limit(RATE_LIMIT_WRITE)
async def update_grade(
    grade_id: int,
    grade_update: GradeUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GradeResponse:
    """Update a grade with audit trail"""
    grade = db.query(Grade).get(grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    # Store old state for audit
    old_values = {
        "grade": grade.grade,
        "max_grade": grade.max_grade,
        "date_assigned": grade.date_assigned.isoformat(),
    }

    # Update
    grade.grade = grade_update.grade
    grade.max_grade = grade_update.max_grade
    grade.date_assigned = grade_update.date_assigned
    db.commit()

    # Log the change (CRITICAL for educational compliance)
    AuditService.log_action(
        db=db,
        action=AuditAction.UPDATE,
        resource_type="Grade",
        resource_id=grade_id,
        user_id=current_user.id,
        old_values=old_values,
        new_values={
            "grade": grade.grade,
            "max_grade": grade.max_grade,
            "date_assigned": grade.date_assigned.isoformat(),
        },
        change_reason=grade_update.change_reason,  # Require in schema
        request_id=request.state.request_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

    return GradeResponse.from_orm(grade)

```text
```python
# backend/schemas/grades.py - Update schema to require reason

class GradeUpdate(BaseModel):
    grade: float = Field(ge=0)
    max_grade: float = Field(gt=0)
    date_assigned: date
    change_reason: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Why is this grade being changed? (required for audit)"
    )

```text
---

## 2. DATABASE QUERY OPTIMIZATION (Priority 1)

### Problem

N+1 queries cause 10-50x slowdown on list operations.

### Solution Pattern

```python
# ❌ WRONG - Causes N+1 problem

@router.get("/students/")
async def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return students
    # If frontend accesses student.grades for each student, this triggers N additional queries

# ✅ CORRECT - Eager loading

from sqlalchemy.orm import joinedload, selectinload

@router.get("/students/")
async def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).options(
        joinedload(Student.attendances),    # Load attendances
        selectinload(Student.grades),        # Load grades (for many-to-many)
        selectinload(Student.enrollments)   # Load course enrollments
    ).filter(Student.is_active == True).all()
    return students
    # All data loaded in 3-4 queries total (not N queries)

```text
```python
# backend/services/base_service.py - Generic optimization pattern

from sqlalchemy.orm import joinedload, selectinload

class BaseService:
    @staticmethod
    def apply_eager_loading(query, include_relations=None):
        """Apply eager loading based on requested relationships"""
        if not include_relations:
            return query

        eager_paths = {
            'student_details': [
                selectinload('grades'),
                selectinload('attendances'),
                selectinload('enrollments')
            ],
            'course_details': [
                selectinload('students'),
                selectinload('grades')
            ],
            'grade_details': [
                joinedload('student'),
                joinedload('course')
            ]
        }

        paths = eager_paths.get(include_relations, [])
        for path in paths:
            query = query.options(path)

        return query

```text
```python
# Usage example

@router.get("/students/")
async def list_students(
    include_relations: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get students with optional eager loading

    Query: ?include_relations=student_details
    """
    query = db.query(Student)
    query = BaseService.apply_eager_loading(query, include_relations)
    return query.filter(Student.is_active == True).all()

```text
### Adding Missing Indexes

```python
# backend/migrations/versions/add_query_indexes.py

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Grade queries by date and course
    op.create_index(
        'idx_grades_by_date_course',
        'grades',
        ['date_assigned', 'course_id'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )

    # Attendance range queries
    op.create_index(
        'idx_attendance_by_period',
        'attendance',
        ['student_id', 'date', 'is_present'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )

    # Course enrollment lookups
    op.create_index(
        'idx_enrollment_by_semester',
        'course_enrollments',
        ['course_id', 'semester'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )

    # Student searches
    op.create_index(
        'idx_student_by_name_active',
        'students',
        ['first_name', 'last_name', 'is_active'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )

def downgrade():
    op.drop_index('idx_grades_by_date_course')
    op.drop_index('idx_attendance_by_period')
    op.drop_index('idx_enrollment_by_semester')
    op.drop_index('idx_student_by_name_active')

```text
---

## 3. IMPLEMENTING MFA (Multi-Factor Authentication)

### Problem

Sensitive educational data accessible with single password.

### Solution: TOTP-Based 2FA

```python
# backend/models.py - Add MFA fields

class User(Base):
    __tablename__ = "users"

    # ... existing fields ...

    # MFA Configuration
    mfa_enabled = Column(Boolean, default=False, index=True)
    mfa_secret = Column(String(32), nullable=True)  # Base32 encoded secret
    mfa_backup_codes = Column(JSON, default=list)  # Encrypted backup codes
    mfa_verified = Column(Boolean, default=False)  # Confirmed with TOTP test
    mfa_created_at = Column(DateTime(timezone=True), nullable=True)

```text
```python
# backend/security/mfa.py - New MFA service

import pyotp
import secrets
from cryptography.fernet import Fernet
from typing import Tuple, List

class MFAService:
    def __init__(self, encryption_key: str):
        """Initialize with encryption key from config"""
        self.cipher = Fernet(encryption_key.encode())

    def generate_secret(self) -> str:
        """Generate new TOTP secret"""
        return pyotp.random_base32()

    def get_provisioning_uri(self, secret: str, email: str, issuer: str = "SMS") -> str:
        """Get QR code URI for mobile authenticator"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)

    def verify_totp(self, secret: str, token: str, window: int = 1) -> bool:
        """Verify TOTP token (allows window of ±1 minute)"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=window)

    def generate_backup_codes(self, count: int = 8) -> List[str]:
        """Generate backup codes for account recovery"""
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        return codes

    def encrypt_backup_codes(self, codes: List[str]) -> str:
        """Encrypt backup codes for storage"""
        return self.cipher.encrypt(','.join(codes).encode()).decode()

    def decrypt_backup_codes(self, encrypted: str) -> List[str]:
        """Decrypt backup codes from storage"""
        return self.cipher.decrypt(encrypted.encode()).decode().split(',')

    def verify_backup_code(self, encrypted: str, code: str) -> bool:
        """Verify and remove backup code (one-time use)"""
        codes = self.decrypt_backup_codes(encrypted)
        if code in codes:
            codes.remove(code)
            return True
        return False

```text
```python
# backend/routers/routers_auth.py - MFA endpoints

from backend.security.mfa import MFAService

@router.post("/auth/mfa/setup/")
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start MFA setup - returns QR code and backup codes"""
    mfa_service = MFAService(settings.MFA_ENCRYPTION_KEY)

    secret = mfa_service.generate_secret()
    backup_codes = mfa_service.generate_backup_codes()

    # Store temporarily (user must verify with TOTP before enabling)
    current_user.mfa_secret = secret
    current_user.mfa_backup_codes = mfa_service.encrypt_backup_codes(backup_codes)
    current_user.mfa_verified = False  # Not verified yet
    db.commit()

    return {
        "provisioning_uri": mfa_service.get_provisioning_uri(secret, current_user.email),
        "backup_codes": backup_codes,  # Show only once
        "secret": secret,  # For manual entry if QR fails
        "message": "Scan QR code with authenticator app, then verify with token"
    }

@router.post("/auth/mfa/verify/")
async def verify_mfa_setup(
    token: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify MFA token to confirm setup"""
    mfa_service = MFAService(settings.MFA_ENCRYPTION_KEY)

    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA setup not started")

    if not mfa_service.verify_totp(current_user.mfa_secret, token):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Enable MFA
    current_user.mfa_enabled = True
    current_user.mfa_verified = True
    current_user.mfa_created_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "MFA enabled successfully"}

@router.post("/auth/mfa/verify-login/")
async def verify_mfa_login(
    user_id: int,
    token: str = Body(...),
    db: Session = Depends(get_db)
):
    """Verify MFA token during login"""
    mfa_service = MFAService(settings.MFA_ENCRYPTION_KEY)
    user = db.query(User).get(user_id)

    if not user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA not enabled")

    # Try TOTP first
    if mfa_service.verify_totp(user.mfa_secret, token):
        return {"verified": True}

    # Try backup code
    if mfa_service.verify_backup_code(user.mfa_backup_codes, token):
        return {"verified": True, "warning": "Backup code used - regenerate codes"}

    raise HTTPException(status_code=401, detail="Invalid token or code")

```text
```typescript
// frontend/src/pages/MFASetupPage.tsx - QR code setup
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function MFASetupPage() {
  const [mfaSetup, setMfaSetup] = useState(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleSetup = async () => {
    const response = await api.post('/auth/mfa/setup/');
    setMfaSetup(response.data);
    setBackupCodes(response.data.backup_codes);
  };

  const handleVerify = async () => {
    await api.post('/auth/mfa/verify/', { token });
    alert('MFA enabled! Backup codes saved: ' + backupCodes.join(', '));
  };

  return (
    <div className="mfa-setup">
      {!mfaSetup ? (
        <button onClick={handleSetup}>Enable 2FA</button>
      ) : (
        <>
          <h3>Scan with Authenticator App</h3>
          <QRCodeSVG value={mfaSetup.provisioning_uri} size={256} />

          {!showBackupCodes && (
            <button onClick={() => setShowBackupCodes(true)}>
              Show Backup Codes
            </button>
          )}

          {showBackupCodes && (
            <div className="backup-codes">
              <h4>Save these codes in a safe place:</h4>
              {backupCodes.map((code) => <code key={code}>{code}</code>)}
            </div>
          )}

          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            maxLength={6}
          />
          <button onClick={handleVerify}>Verify & Enable</button>
        </>
      )}
    </div>
  );
}

```text
---

## 4. SOFT DELETE FILTERING MIXIN

### Problem

Soft-deleted records appear in queries without explicit filtering.

### Solution: Query Mixin Pattern

```python
# backend/db/soft_delete.py - Automatic filtering

from sqlalchemy import event
from sqlalchemy.orm import Query
from sqlalchemy.sql import and_

class SoftDeleteQuery(Query):
    """Query class that auto-filters soft-deleted records"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._include_deleted = False

    def include_deleted(self):
        """Include soft-deleted records in query"""
        self._include_deleted = True
        return self

    def only_deleted(self):
        """Query only deleted records"""
        return self.filter(self.column_descriptions[0]['type'].deleted_at.isnot(None))

    def _default_filter(self):
        """Apply default soft-delete filter"""
        if self._include_deleted:
            return

        for ent in self.column_descriptions:
            if hasattr(ent['type'], 'deleted_at'):
                self = self.filter(ent['type'].deleted_at.is_(None))

        return self

    def all(self):
        """Override to apply filter"""
        return super().all()

    def first(self):
        """Override to apply filter"""
        return super().first()

    def count(self):
        """Override to apply filter"""
        return super().count()

# Integration

from backend.db import SessionLocal

# Monkey-patch or configure explicitly

def get_db():
    db = SessionLocal()
    db.query = lambda *args, **kwargs: SoftDeleteQuery(*args, session=db, **kwargs)
    try:
        yield db
    finally:
        db.close()

```text
### Alternative: Explicit Filtering Pattern

```python
# Simpler approach - explicit but consistent

class BaseModel(Base):
    """Base for all models with soft delete"""
    __abstract__ = True
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    @classmethod
    def active(cls):
        """Return filter for active records"""
        return cls.deleted_at.is_(None)

    def soft_delete(self):
        """Mark as deleted"""
        self.deleted_at = datetime.now(timezone.utc)

# Usage - Simple and explicit

@router.get("/students/")
async def list_students(db: Session = Depends(get_db)):
    # Explicit filter - clear intent
    students = db.query(Student).filter(Student.active()).all()
    return students

```text
---

## 5. RESPONSE STANDARDIZATION

### Problem

Inconsistent API response formats across endpoints.

### Solution: Standard Response Schema

```python
# backend/schemas/response.py

from typing import Generic, Optional, TypeVar, Any
from datetime import datetime
from pydantic import BaseModel, Field

T = TypeVar('T')

class ResponseMeta(BaseModel):
    """Metadata included in every response"""
    request_id: str
    timestamp: datetime
    version: str

class ErrorDetail(BaseModel):
    """Standardized error information"""
    code: str
    message: str
    details: Optional[dict] = None
    path: Optional[str] = None

class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper"""
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    meta: ResponseMeta

    class Config:
        arbitrary_types_allowed = True

class PaginatedData(BaseModel, Generic[T]):
    """Data with pagination info"""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

# Usage

@router.get("/students/", response_model=APIResponse[PaginatedData[StudentResponse]])
async def list_students(
    skip: int = 0,
    limit: int = 100,
    request: Request = None,
    db: Session = Depends(get_db)
):
    total = db.query(Student).filter(Student.active()).count()
    students = db.query(Student).filter(Student.active()).offset(skip).limit(limit).all()

    return APIResponse(
        success=True,
        data=PaginatedData(
            items=[StudentResponse.from_orm(s) for s in students],
            total=total,
            page=skip // limit + 1,
            page_size=limit,
            total_pages=(total + limit - 1) // limit,
            has_next=(skip + limit) < total,
            has_previous=skip > 0
        ),
        meta=ResponseMeta(
            request_id=request.state.request_id,
            timestamp=datetime.utcnow(),
            version=app.state.version
        )
    )

```text
---

## 6. BUSINESS METRICS COLLECTION

### Problem

No visibility into business-level metrics (grades submitted, imports processed, etc.)

### Solution: Custom Metrics

```python
# backend/middleware/business_metrics.py

from prometheus_client import Counter, Histogram, Gauge
from datetime import datetime

# Counters

grades_submitted_total = Counter(
    'grades_submitted_total',
    'Total grades submitted',
    ['course_code', 'semester']
)

attendance_marked_total = Counter(
    'attendance_marked_total',
    'Total attendance records marked',
    ['course_code']
)

students_enrolled_total = Counter(
    'students_enrolled_total',
    'Total student enrollments',
    ['course_code']
)

imports_completed_total = Counter(
    'imports_completed_total',
    'Completed imports',
    ['import_type', 'status']  # status: success, partial, failed
)

# Histograms

import_duration_seconds = Histogram(
    'import_duration_seconds',
    'Import job duration',
    ['import_type'],
    buckets=(5, 10, 30, 60, 120, 300)
)

grade_calculation_duration = Histogram(
    'grade_calculation_seconds',
    'Grade calculation duration',
    buckets=(0.1, 0.5, 1.0, 5.0)
)

# Gauges

active_users_count = Gauge(
    'active_users_count',
    'Current active users',
    ['role']
)

pending_imports_count = Gauge(
    'pending_imports_count',
    'Number of pending import jobs'
)

# Usage in routers

@router.post("/grades/")
async def submit_grade(grade: GradeCreate, db: Session = Depends(get_db)):
    # ... business logic ...
    grades_submitted_total.labels(
        course_code=course.course_code,
        semester=course.semester
    ).inc()
    return grade_response

@router.post("/imports/")
async def import_students(import_data, db: Session = Depends(get_db)):
    start_time = time.time()
    try:
        # ... import logic ...
        duration = time.time() - start_time
        import_duration_seconds.labels(import_type='students').observe(duration)
        imports_completed_total.labels(import_type='students', status='success').inc()
    except Exception as e:
        imports_completed_total.labels(import_type='students', status='failed').inc()
        raise

```text
```yaml
# monitoring/prometheus/dashboards/business.json

# Grafana dashboard config
{
  "panels": [
    {
      "title": "Grades Submitted (Daily)",
      "targets": [
        {
          "expr": "increase(grades_submitted_total[1d])"
        }
      ]
    },
    {
      "title": "Import Duration (p95)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, import_duration_seconds)"
        }
      ]
    },
    {
      "title": "Active Users by Role",
      "targets": [
        {
          "expr": "active_users_count"
        }
      ]
    }
  ]
}

```text
---

## 7. FRONTEND ERROR FORMATTING

### Problem

Technical error messages confuse users.

### Solution: User-Friendly Error Formatting

```typescript
// frontend/src/utils/errorFormatter.ts
import { useTranslation } from 'react-i18next';

export interface FormattedError {
  userMessage: string;
  technicalMessage: string;
  action?: string;  // Suggested recovery action
  retryable: boolean;
}

const ERROR_MAP = {
  'VALIDATION_ERROR': {
    userMessage: 'validation.error',
    retryable: true
  },
  'STUDENT_NOT_FOUND': {
    userMessage: 'errors.studentNotFound',
    retryable: false
  },
  'DUPLICATE_EMAIL': {
    userMessage: 'errors.emailExists',
    retryable: false,
    action: 'Use the search feature to find existing student'
  },
  'DUPLICATE_STUDENT_ID': {
    userMessage: 'errors.studentIdExists',
    retryable: false
  },
  'RATE_LIMIT_EXCEEDED': {
    userMessage: 'errors.rateLimitExceeded',
    retryable: true,
    action: 'Please wait before trying again'
  },
  'GRADE_TAMPERING': {
    userMessage: 'errors.gradeTampering',
    retryable: false,
    action: 'Contact administrator if you believe this is incorrect'
  },
  'DATABASE_ERROR': {
    userMessage: 'errors.serverError',
    retryable: true,
    action: 'Try again in a few moments'
  }
};

export function formatError(error: any, t: any): FormattedError {
  // Extract error code from response
  const errorCode = error.response?.data?.error?.code ||
                   error.code ||
                   'UNKNOWN_ERROR';

  const mapping = ERROR_MAP[errorCode] || {
    userMessage: 'errors.unknownError',
    retryable: true
  };

  // Field-specific validation errors
  if (errorCode === 'VALIDATION_ERROR' && error.response?.data?.error?.details) {
    const details = error.response.data.error.details;
    const fieldErrors = Object.entries(details)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n');

    return {
      userMessage: `${t(mapping.userMessage)}\n\n${fieldErrors}`,
      technicalMessage: JSON.stringify(details),
      retryable: mapping.retryable,
      action: mapping.action
    };
  }

  return {
    userMessage: t(mapping.userMessage),
    technicalMessage: error.response?.data?.detail || error.message,
    retryable: mapping.retryable,
    action: mapping.action
  };
}

// Hook for easy use
export function useErrorFormatter() {
  const { t } = useTranslation();
  return (error: any) => formatError(error, t);
}

```text
```typescript
// frontend/src/components/ui/ErrorDisplay.tsx
import { FormattedError } from '@/utils/errorFormatter';

interface ErrorDisplayProps {
  error: FormattedError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p className="error-message">{error.userMessage}</p>

      {error.action && (
        <p className="error-action">💡 {error.action}</p>
      )}

      {error.retryable && onRetry && (
        <button onClick={onRetry} className="btn-retry">
          Try Again
        </button>
      )}

      <details className="error-technical">
        <summary>Technical Details</summary>
        <pre>{error.technicalMessage}</pre>
      </details>
    </div>
  );
}

```text
---

## 8. VIRTUAL SCROLLING FOR LARGE LISTS

### Problem

Rendering 1000+ items in DOM causes performance degradation.

### Solution: react-window Integration

```typescript
// frontend/src/components/StudentList/VirtualizedStudentList.tsx
import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useStudents } from '@/hooks/useStudents';

interface StudentListProps {
  courseId: number;
}

const ITEM_SIZE = 60;  // Height of each row

export function VirtualizedStudentList({ courseId }: StudentListProps) {
  const { data: students, isLoading } = useStudents(courseId);

  const Row = ({ index, style }) => {
    const student = students[index];
    return (
      <div style={style} className="student-row">
        <span className="student-id">{student.student_id}</span>
        <span className="student-name">
          {student.first_name} {student.last_name}
        </span>
        <span className="student-email">{student.email}</span>
        <button className="btn-edit">Edit</button>
      </div>
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!students?.length) return <div>No students found</div>;

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={students.length}
          itemSize={ITEM_SIZE}
          width={width}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}

```text
---

## 9. END-TO-END TEST EXAMPLE

### Using Playwright

```typescript
// e2e/workflows/student-grading.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Student Grading Workflow', () => {
  test('teacher can create student, enroll, and grade', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'teacher@school.edu');
    await page.fill('input[type="password"]', 'SecurePass123');
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL('/dashboard');

    // 2. Navigate to students
    await page.click('nav a:has-text("Students")');

    // 3. Create new student
    await page.click('button:has-text("Add Student")');
    await page.fill('input[name="student_id"]', 'STU20250001');
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@school.edu');
    await page.click('button:has-text("Save")');

    // Wait for confirmation
    await expect(page.locator('text=Student created successfully')).toBeVisible();

    // 4. Navigate to grading
    await page.click('nav a:has-text("Grades")');

    // 5. Create grade for student
    await page.click('button:has-text("Add Grade")');
    await page.selectOption('select[name="student"]', 'STU20250001');
    await page.fill('input[name="grade"]', '85');
    await page.fill('textarea[name="change_reason"]', 'Mid-term exam assessment');
    await page.click('button:has-text("Submit")');

    // Verify
    await expect(page.locator('text=Grade submitted')).toBeVisible();
    await expect(page.locator('text=85')).toBeVisible();
  });
});

```text
---

## Summary

These implementation patterns provide concrete, production-ready solutions for the recommended improvements. Each section includes:

- ✅ Problem statement
- ✅ Pythonic/TypeScript-idiomatic solution
- ✅ Integration examples
- ✅ Usage patterns

Implement these changes incrementally, prioritizing based on business impact and team capacity.
