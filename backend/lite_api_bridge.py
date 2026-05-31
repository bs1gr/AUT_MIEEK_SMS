"""
SMS Native Lite - PyWebView API Bridge

Direct Python→JavaScript communication without HTTP.
All methods are synchronous (PyWebView js_api requirement).
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from decimal import Decimal

from backend.db import SessionLocal
from backend.services import (
    StudentService,
    GradeService,
    CourseService,
    EnrollmentService,
    AttendanceService,
)
from backend.schemas import (
    StudentCreate,
    StudentUpdate,
    GradeCreate,
    GradeUpdate,
    CourseCreate,
    CourseUpdate,
)
from backend.schemas.enrollments import EnrollmentCreate
from backend.schemas.attendance import AttendanceCreate, AttendanceUpdate
from backend.schemas.common import PaginationParams
from backend.main import get_version


class LiteApiBridge:
    """PyWebView API bridge - exposes methods as window.pywebview.api.*"""

    def __init__(self) -> None:
        pass

    @staticmethod
    def _model_to_dict(obj: Any) -> Dict[str, Any]:
        """Convert SQLAlchemy model to plain dict (JSON-serializable)."""
        if obj is None:
            return None
        if isinstance(obj, dict):
            return obj
        if isinstance(obj, (list, tuple)):
            return [LiteApiBridge._model_to_dict(item) for item in obj]

        result = {}
        for col in obj.__table__.columns:
            val = getattr(obj, col.name, None)
            # Serialize dates/datetimes as ISO strings
            if isinstance(val, (date, datetime)):
                result[col.name] = val.isoformat()
            elif isinstance(val, Decimal):
                result[col.name] = float(val)
            else:
                result[col.name] = val
        return result

    def _error_response(self, e: Exception) -> Dict[str, Any]:
        """Consistent error response."""
        return {"error": str(e), "type": e.__class__.__name__}

    # ========== STUDENTS ==========

    def get_students(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """Get paginated list of students."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            result = service.list_students(skip=skip, limit=limit, is_active=None)
            return {
                "items": [self._model_to_dict(s) for s in result.items],
                "total": result.total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_student(self, student_id: int) -> Any:
        """Get single student by ID."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            student = service.get_student(student_id)
            return self._model_to_dict(student)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def create_student(self, data: Dict[str, Any]) -> Any:
        """Create new student."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            student_create = StudentCreate(**data)
            student = service.create_student(student_create)
            db.commit()
            return self._model_to_dict(student)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def update_student(self, student_id: int, data: Dict[str, Any]) -> Any:
        """Update student."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            student_update = StudentUpdate(**data)
            student = service.update_student(student_id, student_update)
            db.commit()
            return self._model_to_dict(student)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def delete_student(self, student_id: int) -> Dict[str, Any]:
        """Delete (soft-delete) student."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            service.delete_student(student_id)
            db.commit()
            return {"message": f"Student {student_id} deleted"}
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def search_students(self, q: str, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """Search students by name or email."""
        db = SessionLocal()
        try:
            service = StudentService(db)
            result = service.search_students(q, skip=skip, limit=limit)
            return {
                "items": [self._model_to_dict(s) for s in result.items],
                "total": result.total,
                "query": q,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    # ========== GRADES ==========

    def get_grades(
        self,
        skip: int = 0,
        limit: int = 100,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of grades."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            result = service.list_grades(
                skip=skip,
                limit=limit,
                student_id=student_id,
                course_id=course_id,
            )
            return {
                "items": [self._model_to_dict(g) for g in result.items],
                "total": result.total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_grade(self, grade_id: int) -> Any:
        """Get single grade by ID."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            grade = service.get_grade(grade_id)
            return self._model_to_dict(grade)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def create_grade(self, data: Dict[str, Any]) -> Any:
        """Create new grade."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            grade_create = GradeCreate(**data)
            grade = service.create_grade(grade_create)
            db.commit()
            return self._model_to_dict(grade)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def update_grade(self, grade_id: int, data: Dict[str, Any]) -> Any:
        """Update grade."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            grade_update = GradeUpdate(**data)
            grade = service.update_grade(grade_id, grade_update)
            db.commit()
            return self._model_to_dict(grade)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def delete_grade(self, grade_id: int) -> Dict[str, Any]:
        """Delete (soft-delete) grade."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            service.delete_grade(grade_id)
            db.commit()
            return {"message": f"Grade {grade_id} deleted"}
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def get_grades_by_student(self, student_id: int) -> List[Dict[str, Any]]:
        """Get all grades for a student."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            grades = service.list_student_grades(student_id)
            return [self._model_to_dict(g) for g in grades]
        except Exception as e:
            return {"error": str(e)}
        finally:
            db.close()

    def get_grades_by_course(self, course_id: int) -> List[Dict[str, Any]]:
        """Get all grades for a course."""
        db = SessionLocal()
        try:
            service = GradeService(db)
            grades = service.list_course_grades(course_id)
            return [self._model_to_dict(g) for g in grades]
        except Exception as e:
            return {"error": str(e)}
        finally:
            db.close()

    # ========== COURSES ==========

    def get_courses(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """Get paginated list of courses."""
        db = SessionLocal()
        try:
            service = CourseService(db)
            result = service.list_courses(skip=skip, limit=limit)
            return {
                "items": [self._model_to_dict(c) for c in result.items],
                "total": result.total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_course(self, course_id: int) -> Any:
        """Get single course by ID."""
        db = SessionLocal()
        try:
            service = CourseService(db)
            course = service.get_course(course_id)
            return self._model_to_dict(course)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def create_course(self, data: Dict[str, Any]) -> Any:
        """Create new course."""
        db = SessionLocal()
        try:
            service = CourseService(db)
            course_create = CourseCreate(**data)
            course = service.create_course(course_create)
            db.commit()
            return self._model_to_dict(course)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def update_course(self, course_id: int, data: Dict[str, Any]) -> Any:
        """Update course."""
        db = SessionLocal()
        try:
            service = CourseService(db)
            course_update = CourseUpdate(**data)
            course = service.update_course(course_id, course_update)
            db.commit()
            return self._model_to_dict(course)
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def delete_course(self, course_id: int) -> Dict[str, Any]:
        """Delete (soft-delete) course."""
        db = SessionLocal()
        try:
            service = CourseService(db)
            service.delete_course(course_id)
            db.commit()
            return {"message": f"Course {course_id} deleted"}
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    # ========== ENROLLMENTS ==========

    def get_enrollments(self, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
        """Get all enrollments paginated."""
        db = SessionLocal()
        try:
            pagination = PaginationParams(skip=skip, limit=limit)
            result = EnrollmentService.get_all_enrollments(db, pagination)
            # Handle both dict and object returns
            if isinstance(result, dict):
                items = result.get('items', [])
                total = result.get('total', 0)
            else:
                items = result.items if hasattr(result, 'items') else result
                total = result.total if hasattr(result, 'total') else len(items)
            return {
                "items": [self._model_to_dict(e) for e in items],
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_enrollments_by_course(self, course_id: int) -> Any:
        """Get enrollments for a specific course."""
        db = SessionLocal()
        try:
            enrollments = EnrollmentService.list_course_enrollments(db, course_id)
            return [self._model_to_dict(e) for e in enrollments]
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_enrollments_by_student(self, student_id: int) -> Any:
        """Get enrollments for a specific student."""
        db = SessionLocal()
        try:
            enrollments = EnrollmentService.list_student_enrollments(db, student_id)
            return [self._model_to_dict(e) for e in enrollments]
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_enrolled_students(self, course_id: int) -> Any:
        """Get students enrolled in a course."""
        db = SessionLocal()
        try:
            students = EnrollmentService.list_enrolled_students(db, course_id)
            return [self._model_to_dict(s) for s in students]
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def enroll_students(self, course_id: int, student_ids: List[int]) -> Dict[str, Any]:
        """Enroll students in a course."""
        db = SessionLocal()
        try:
            payload = EnrollmentCreate(student_ids=student_ids)
            result = EnrollmentService.enroll_students(db, course_id, payload)
            db.commit()
            return result
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    def unenroll_student(self, course_id: int, student_id: int) -> Dict[str, Any]:
        """Unenroll a student from a course."""
        db = SessionLocal()
        try:
            result = EnrollmentService.unenroll_student(db, course_id, student_id)
            db.commit()
            return result
        except Exception as e:
            db.rollback()
            return self._error_response(e)
        finally:
            db.close()

    # ========== ATTENDANCE ==========

    def get_attendance(
        self,
        skip: int = 0,
        limit: int = 100,
        student_id: Optional[int] = None,
        course_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get attendance records with optional filters."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            result = svc.list_attendance(
                skip=skip,
                limit=limit,
                student_id=student_id,
                course_id=course_id,
            )
            return {
                "items": [self._model_to_dict(a) for a in result.items],
                "total": result.total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_attendance_record(self, attendance_id: int) -> Any:
        """Get single attendance record by ID."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            record = svc.get_attendance(attendance_id)
            return self._model_to_dict(record)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def create_attendance(self, data: Dict[str, Any]) -> Any:
        """Create attendance record."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            attendance_create = AttendanceCreate(**data)
            record = svc.create_attendance(attendance_create)
            return self._model_to_dict(record)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def update_attendance(self, attendance_id: int, data: Dict[str, Any]) -> Any:
        """Update attendance record."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            attendance_update = AttendanceUpdate(**data)
            record = svc.update_attendance(attendance_id, attendance_update)
            return self._model_to_dict(record)
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def delete_attendance(self, attendance_id: int) -> Dict[str, Any]:
        """Soft-delete attendance record."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            svc.delete_attendance(attendance_id)
            return {"message": f"Attendance {attendance_id} deleted"}
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_attendance_by_student(self, student_id: int) -> Any:
        """Get all attendance for a student."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            result = svc.list_attendance(skip=0, limit=10000, student_id=student_id)
            return [self._model_to_dict(a) for a in result.items]
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    def get_attendance_by_course(self, course_id: int) -> Any:
        """Get all attendance for a course."""
        db = SessionLocal()
        try:
            svc = AttendanceService(db)
            result = svc.list_attendance(skip=0, limit=10000, course_id=course_id)
            return [self._model_to_dict(a) for a in result.items]
        except Exception as e:
            return self._error_response(e)
        finally:
            db.close()

    # ========== SYSTEM ==========

    def get_version(self) -> Dict[str, str]:
        """Get application version."""
        try:
            return {"version": get_version()}
        except Exception as e:
            return self._error_response(e)

    def get_health(self) -> Dict[str, str]:
        """Health check endpoint."""
        return {"status": "healthy"}
