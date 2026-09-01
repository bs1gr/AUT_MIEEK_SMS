"""Semester archive business logic.

Given a semester (the free-text Course.semester label), finds every active
enrollment where the student has passed the course (weighted final grade,
fully graded), backs up the whole semester's data, then replaces the raw
CourseEnrollment/Grade/Attendance/DailyPerformance rows for those passed
courses with one permanent StudentCoursePerformance record each. Failed,
dropped, or still-in-progress enrollments are left untouched.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, selectinload

from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.services.analytics_service import AnalyticsService
from backend.services.semester_export_service import SemesterExportService

logger = logging.getLogger(__name__)


class SemesterArchiveService:
    """Service for previewing and executing semester archive runs."""

    def __init__(self, db: Session) -> None:
        self.db = db
        (
            self.Student,
            self.Course,
            self.CourseEnrollment,
            self.Grade,
            self.DailyPerformance,
            self.Attendance,
            self.SemesterArchiveExport,
            self.StudentCoursePerformance,
        ) = import_names(
            "models",
            "Student",
            "Course",
            "CourseEnrollment",
            "Grade",
            "DailyPerformance",
            "Attendance",
            "SemesterArchiveExport",
            "StudentCoursePerformance",
        )
        self.analytics = AnalyticsService(db)

    # ----------------------------- Listing ---------------------------------
    def list_semesters(self) -> List[Dict[str, Any]]:
        """Distinct Course.semester values with course counts and whether a
        completed archive run already exists for that semester."""
        rows = (
            self.db.query(self.Course.semester)
            .filter(self.Course.deleted_at.is_(None), self.Course.semester.isnot(None))
            .all()
        )
        semester_counts: Dict[str, int] = {}
        for (semester,) in rows:
            semester_counts[semester] = semester_counts.get(semester, 0) + 1

        archived = {
            row[0]
            for row in self.db.query(self.SemesterArchiveExport.semester)
            .filter(self.SemesterArchiveExport.status == "completed")
            .distinct()
            .all()
        }

        return [
            {"semester": semester, "course_count": count, "already_archived": semester in archived}
            for semester, count in sorted(semester_counts.items())
        ]

    def list_exports(self) -> List[Any]:
        return (
            self.db.query(self.SemesterArchiveExport)
            .order_by(self.SemesterArchiveExport.started_at.desc())
            .all()
        )

    def get_student_performance_history(self, student_id: int) -> List[Any]:
        return (
            self.db.query(self.StudentCoursePerformance)
            .filter(self.StudentCoursePerformance.student_id == student_id)
            .order_by(self.StudentCoursePerformance.archived_at.desc())
            .all()
        )

    # ----------------------------- Eligibility ------------------------------
    def _active_enrollments_for_semester(self, semester: str) -> List[Any]:
        return (
            self.db.query(self.CourseEnrollment)
            .options(selectinload(self.CourseEnrollment.student), selectinload(self.CourseEnrollment.course))
            .join(self.Course, self.CourseEnrollment.course_id == self.Course.id)
            .filter(
                self.Course.semester == semester,
                self.Course.deleted_at.is_(None),
                self.CourseEnrollment.deleted_at.is_(None),
            )
            .all()
        )

    def _fetch_grading_records_for_pairs(self, course_ids: List[int], student_ids: List[int]) -> Dict[str, Any]:
        """Batch-fetch every Grade/DailyPerformance/Attendance row for the given
        course/student sets in 3 queries total, grouped by (student_id, course_id),
        so `_evaluate_pair` never needs a per-enrollment round trip."""
        if not course_ids or not student_ids:
            return {"grades": {}, "daily": {}, "attendance": {}}

        def _group_by_pair(rows: List[Any]) -> Dict[Any, List[Any]]:
            grouped: Dict[Any, List[Any]] = {}
            for row in rows:
                grouped.setdefault((row.student_id, row.course_id), []).append(row)
            return grouped

        grades = (
            self.db.query(self.Grade)
            .filter(
                self.Grade.course_id.in_(course_ids),
                self.Grade.student_id.in_(student_ids),
                self.Grade.deleted_at.is_(None),
            )
            .all()
        )
        daily = (
            self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.course_id.in_(course_ids),
                self.DailyPerformance.student_id.in_(student_ids),
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        )
        attendance = (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.course_id.in_(course_ids),
                self.Attendance.student_id.in_(student_ids),
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        )
        return {
            "grades": _group_by_pair(grades),
            "daily": _group_by_pair(daily),
            "attendance": _group_by_pair(attendance),
        }

    def _evaluate_pair(
        self,
        enrollment: Any,
        pass_threshold: float,
        already_archived: Optional[set] = None,
        grading_records: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        student = enrollment.student
        course = enrollment.course

        base = {
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "course_id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
        }

        if already_archived is not None:
            already = (student.id, course.course_code, course.semester) in already_archived
        else:
            already = (
                self.db.query(self.StudentCoursePerformance)
                .filter(
                    self.StudentCoursePerformance.student_id == student.id,
                    self.StudentCoursePerformance.course_code == course.course_code,
                    self.StudentCoursePerformance.semester == course.semester,
                )
                .first()
                is not None
            )
        if already:
            return {**base, "eligible": False, "reason": "already_archived"}

        if not course.evaluation_rules:
            return {**base, "eligible": False, "reason": "no_evaluation_rules"}

        if grading_records is not None:
            pair_key = (student.id, course.id)
            result = self.analytics._calculate_final_grade_from_records(
                student.id,
                course,
                grading_records["grades"].get(pair_key, []),
                grading_records["daily"].get(pair_key, []),
                grading_records["attendance"].get(pair_key, []),
            )
        else:
            result = self.analytics.calculate_final_grade(student.id, course.id)
        if "error" in result:
            return {**base, "eligible": False, "reason": "no_evaluation_rules"}

        total_weight_used = result["total_weight_used"]
        final_grade = result["final_grade"]

        if total_weight_used < 100:
            return {
                **base,
                "eligible": False,
                "reason": "incomplete_grading",
                "final_grade": final_grade,
                "total_weight_used": total_weight_used,
            }

        if final_grade < pass_threshold:
            return {
                **base,
                "eligible": False,
                "reason": "not_passed",
                "final_grade": final_grade,
                "total_weight_used": total_weight_used,
            }

        return {
            **base,
            "eligible": True,
            "final_grade": final_grade,
            "letter_grade": result["letter_grade"],
            "gpa": result["gpa"],
            "total_weight_used": total_weight_used,
            "enrollment": enrollment,
            "course": course,
            "student": student,
        }

    def preview(self, semester: str, pass_threshold: float = 60.0) -> Dict[str, Any]:
        """Dry run: evaluate every active enrollment for `semester` without writing anything."""
        enrollments = self._active_enrollments_for_semester(semester)

        course_ids = list({e.course_id for e in enrollments})
        student_ids = list({e.student_id for e in enrollments})

        already_archived_rows = (
            self.db.query(
                self.StudentCoursePerformance.student_id,
                self.StudentCoursePerformance.course_code,
                self.StudentCoursePerformance.semester,
            )
            .filter(self.StudentCoursePerformance.semester == semester)
            .all()
            if student_ids
            else []
        )
        already_archived = set(already_archived_rows)

        grading_records = self._fetch_grading_records_for_pairs(course_ids, student_ids)

        eligible: List[Dict[str, Any]] = []
        excluded: List[Dict[str, Any]] = []
        for enrollment in enrollments:
            pair = self._evaluate_pair(enrollment, pass_threshold, already_archived, grading_records)
            if pair["eligible"]:
                eligible.append(pair)
            else:
                excluded.append(pair)

        return {
            "semester": semester,
            "pass_threshold": pass_threshold,
            "eligible": eligible,
            "excluded": excluded,
            "eligible_count": len(eligible),
            "excluded_count": len(excluded),
        }

    # ----------------------------- Execution --------------------------------
    def _record_failed_export(
        self,
        semester: str,
        pass_threshold: float,
        admin_user_id: Optional[int],
        error_message: str,
        export_filename: Optional[str] = None,
    ) -> None:
        """Insert a fresh 'failed' audit row. Used instead of updating the in-progress
        export row so this write never depends on ORM state that a prior rollback may
        have invalidated — it's always a clean single insert + commit."""
        failed_row = self.SemesterArchiveExport(
            semester=semester,
            status="failed",
            pass_threshold=pass_threshold,
            triggered_by_user_id=admin_user_id,
            error_message=error_message[:2000],
            export_filename=export_filename,
            completed_at=datetime.now(timezone.utc),
        )
        self.db.add(failed_row)
        self.db.commit()

    def execute(self, semester: str, pass_threshold: float, admin_user_id: Optional[int]) -> Dict[str, Any]:
        # Recompute eligibility server-side; never trust a client-supplied pair list.
        preview_result = self.preview(semester, pass_threshold)
        eligible = preview_result["eligible"]

        try:
            export_info = SemesterExportService(self.db).create_export(semester, pass_threshold)
        except Exception as exc:
            logger.error("Semester archive export failed for %s: %s", semester, exc, exc_info=True)
            self._record_failed_export(semester, pass_threshold, admin_user_id, f"Export failed: {exc}")
            raise http_error(
                500,
                ErrorCode.SEMESTER_ARCHIVE_EXPORT_FAILED,
                "Failed to create semester export",
                context={"semester": semester},
            )

        # Everything below is applied in a single all-or-nothing transaction: the
        # SemesterArchiveExport bookkeeping row is only ever committed together with
        # the performance records and deletions it accounts for, never on its own.
        export_row = self.SemesterArchiveExport(
            semester=semester,
            status="pending",
            export_filename=export_info["backup_name"],
            pass_threshold=pass_threshold,
            triggered_by_user_id=admin_user_id,
        )
        self.db.add(export_row)
        self.db.flush()  # assign export_row.id for use as a FK below, without committing yet

        students_touched: set = set()
        courses_touched: set = set()
        archived_count = 0

        try:
            for pair in eligible:
                enrollment = pair["enrollment"]
                course = pair["course"]
                student = pair["student"]

                performance = self.StudentCoursePerformance(
                    student_id=student.id,
                    course_id=course.id,
                    course_code=course.course_code,
                    course_name=course.course_name,
                    credits=course.credits,
                    semester=course.semester,
                    final_grade=pair["final_grade"],
                    letter_grade=pair["letter_grade"],
                    gpa=pair["gpa"],
                    passed=True,
                    total_weight_used=pair["total_weight_used"],
                    archived_by_user_id=admin_user_id,
                    export_id=export_row.id,
                )
                self.db.add(performance)

                self.db.query(self.Grade).filter(
                    self.Grade.student_id == student.id, self.Grade.course_id == course.id
                ).delete(synchronize_session=False)
                self.db.query(self.DailyPerformance).filter(
                    self.DailyPerformance.student_id == student.id, self.DailyPerformance.course_id == course.id
                ).delete(synchronize_session=False)
                self.db.query(self.Attendance).filter(
                    self.Attendance.student_id == student.id, self.Attendance.course_id == course.id
                ).delete(synchronize_session=False)
                self.db.delete(enrollment)

                students_touched.add(student.id)
                courses_touched.add(course.id)
                archived_count += 1

            export_row.status = "completed"
            export_row.completed_at = datetime.now(timezone.utc)
            export_row.students_affected = len(students_touched)
            export_row.courses_affected = len(courses_touched)
            export_row.enrollments_archived = archived_count
            export_row.enrollments_skipped = preview_result["excluded_count"]

            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Semester archive execution failed for %s: %s", semester, exc, exc_info=True)
            self._record_failed_export(
                semester, pass_threshold, admin_user_id, str(exc), export_filename=export_info["backup_name"]
            )
            raise http_error(
                500,
                ErrorCode.SEMESTER_ARCHIVE_EXECUTION_FAILED,
                "Semester archive execution failed; no database changes were applied "
                "(the backup export file was already saved)",
                context={"semester": semester},
            )

        for student_id in students_touched:
            self.analytics.invalidate_cache_for_student(student_id)

        return {
            "export_id": export_row.id,
            "export_filename": export_row.export_filename,
            "students_affected": export_row.students_affected,
            "courses_affected": export_row.courses_affected,
            "enrollments_archived": export_row.enrollments_archived,
            "enrollments_skipped": export_row.enrollments_skipped,
        }
