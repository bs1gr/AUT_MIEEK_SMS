from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.db_utils import get_by_id_or_404
from backend.import_resolver import import_names


@dataclass
class StudentCourseSummary:
    course_code: str
    course_name: str
    credits: int
    final_grade: float
    gpa: float
    letter_grade: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AnalyticsService:
    """Encapsulates analytics-related business logic and heavy DB work."""

    exam_categories = {
        "midterm",
        "midterm exam",
        "final exam",
        "final",
        "ενδιάμεση",
        "ενδιάμεση εξέταση",
        "τελική εξέταση",
        "τελική",
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        (
            self.Student,
            self.Course,
            self.Grade,
            self.DailyPerformance,
            self.Attendance,
        ) = import_names(
            "models", "Student", "Course", "Grade", "DailyPerformance", "Attendance"
        )

    # ----------------------------- Public API ---------------------------------
    def calculate_final_grade(self, student_id: int, course_id: int) -> Dict[str, Any]:
        get_by_id_or_404(self.db, self.Student, student_id)
        course = get_by_id_or_404(self.db, self.Course, course_id)

        # Single query with eager loading for all related data
        student_data = (
            self.db.query(self.Student)
            .options(
                joinedload(self.Student.grades).joinedload(self.Grade.course),
                joinedload(self.Student.daily_performances).joinedload(self.DailyPerformance.course),
                joinedload(self.Student.attendances).joinedload(self.Attendance.course),
            )
            .filter(self.Student.id == student_id)
            .first()
        )

        # Filter records by course and deleted_at status
        grades = [
            g for g in student_data.grades
            if g.course_id == course_id and g.deleted_at is None
        ]
        daily = [
            d for d in student_data.daily_performances
            if d.course_id == course_id and d.deleted_at is None
        ]
        attendance = [
            a for a in student_data.attendances
            if a.course_id == course_id and a.deleted_at is None
        ]

        return self._calculate_final_grade_from_records(student_id, course, grades, daily, attendance)

    def get_student_all_courses_summary(self, student_id: int) -> Dict[str, Any]:
        # Single query with eager loading for all related data
        student = (
            self.db.query(self.Student)
            .options(
                joinedload(self.Student.grades).joinedload(self.Grade.course),
                joinedload(self.Student.daily_performances).joinedload(self.DailyPerformance.course),
                joinedload(self.Student.attendances).joinedload(self.Attendance.course),
            )
            .filter(self.Student.id == student_id)
            .first()
        )
        
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404

        # Collect all course IDs from loaded relationships
        course_ids = {
            *(g.course_id for g in student.grades if g.deleted_at is None),
            *(d.course_id for d in student.daily_performances if d.deleted_at is None),
            *(a.course_id for a in student.attendances if a.deleted_at is None),
        }

        # Build dictionaries from already-loaded relationships
        courses_dict: Dict[int, Any] = {}
        grades_by_course: Dict[int, List[Any]] = {}
        daily_by_course: Dict[int, List[Any]] = {}
        attendance_by_course: Dict[int, List[Any]] = {}

        # Process grades (already loaded via joinedload)
        for grade in student.grades:
            if grade.deleted_at is None and grade.course_id in course_ids:
                grades_by_course.setdefault(grade.course_id, []).append(grade)
                if grade.course and grade.course.deleted_at is None:
                    courses_dict[grade.course_id] = grade.course

        # Process daily performance (already loaded)
        for daily in student.daily_performances:
            if daily.deleted_at is None and daily.course_id in course_ids:
                daily_by_course.setdefault(daily.course_id, []).append(daily)
                if daily.course and daily.course.deleted_at is None:
                    courses_dict[daily.course_id] = daily.course

        # Process attendance (already loaded)
        for att in student.attendances:
            if att.deleted_at is None and att.course_id in course_ids:
                attendance_by_course.setdefault(att.course_id, []).append(att)
                if att.course and att.course.deleted_at is None:
                    courses_dict[att.course_id] = att.course

        summaries: List[StudentCourseSummary] = []
        overall_gpa = 0.0
        total_credits = 0

        for course_id in course_ids:
            course = courses_dict.get(course_id)
            if not course:
                continue

            data = self._calculate_final_grade_from_records(
                student_id,
                course,
                grades_by_course.get(course_id, []),
                daily_by_course.get(course_id, []),
                attendance_by_course.get(course_id, []),
            )
            if isinstance(data, dict) and data.get("error"):
                continue

            summaries.append(
                StudentCourseSummary(
                    course_code=course.course_code,
                    course_name=course.course_name,
                    credits=course.credits,
                    final_grade=data["final_grade"],
                    gpa=data["gpa"],
                    letter_grade=data["letter_grade"],
                )
            )
            overall_gpa += float(data["gpa"]) * int(course.credits or 0)
            total_credits += int(course.credits or 0)

        overall_gpa = overall_gpa / total_credits if total_credits > 0 else 0
        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "student_id": student.student_id,
            },
            "overall_gpa": round(overall_gpa, 2),
            "total_credits": total_credits,
            "courses": [summary.to_dict() for summary in summaries],
        }

    def get_student_summary(self, student_id: int) -> Dict[str, Any]:
        # Single query with eager loading for all related data
        student = (
            self.db.query(self.Student)
            .options(
                joinedload(self.Student.grades),
                joinedload(self.Student.attendances),
            )
            .filter(self.Student.id == student_id)
            .first()
        )
        
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404

        # Calculate from loaded relationships (no additional queries)
        attendance_records = [a for a in student.attendances if a.deleted_at is None]
        total_att = len(attendance_records)
        present = len([a for a in attendance_records if a.status == "Present"])
        attendance_rate = (present / total_att * 100) if total_att > 0 else 0

        grades = [g for g in student.grades if g.deleted_at is None]
        avg_grade = sum((g.grade / g.max_grade * 100) for g in grades) / len(grades) if grades else 0

        return {
            "student": {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "email": student.email,
                "student_id": student.student_id,
            },
            "attendance_rate": round(attendance_rate, 2),
            "total_classes": total_att,
            "average_grade": round(avg_grade, 2),
            "total_assignments": len(grades),
        }

    # ----------------------------- Helpers ------------------------------------
    @staticmethod
    def get_letter_grade(percentage: float) -> str:
        if percentage >= 90:
            return "A"
        if percentage >= 80:
            return "B"
        if percentage >= 70:
            return "C"
        if percentage >= 60:
            return "D"
        return "F"

    def _calculate_final_grade_from_records(
        self,
        student_id: int,
        course: Any,
        grades: Optional[List[Any]],
        daily_performance: Optional[List[Any]],
        attendance: Optional[List[Any]],
    ) -> Dict[str, Any]:
        evaluation_rules = course.evaluation_rules or []
        if not evaluation_rules:
            return {"error": "No evaluation rules defined for this course"}

        grades = grades or []
        daily_performance = daily_performance or []
        attendance = attendance or []

        category_scores: Dict[str, float] = {}
        category_details: Dict[str, Any] = {}

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))

            if not category or weight <= 0:
                continue

            weighted_sum = 0.0
            total_item_weight = 0.0

            category_lower = category.lower()
            category_grades = [gr for gr in grades if gr.category == category]

            if category_lower in self.exam_categories and category_grades:
                category_grades = sorted(
                    category_grades,
                    key=lambda g: (g.date_submitted or "1970-01-01", g.id),
                    reverse=True,
                )[:1]

            for grade in category_grades:
                if getattr(grade, "max_grade", 0):
                    grade_pct = (grade.grade / grade.max_grade) * 100
                    weighted_sum += grade_pct
                    total_item_weight += 1.0

            if include_daily:
                for perf in (p for p in daily_performance if p.category == category):
                    if getattr(perf, "max_score", 0):
                        daily_pct = (perf.score / perf.max_score) * 100
                        weighted_sum += daily_pct * daily_multiplier
                        total_item_weight += daily_multiplier

            if category_lower in {"attendance", "παρουσία"}:
                if attendance:
                    total = len(attendance)
                    present = len([a for a in attendance if str(a.status).lower() == "present"])
                    att_pct = (present / total * 100) if total > 0 else 0
                    weighted_sum += att_pct
                    total_item_weight += 1.0

            if total_item_weight > 0:
                avg = weighted_sum / total_item_weight
                category_scores[category] = avg
                category_details[category] = {
                    "average": avg,
                    "weight": weight,
                    "contribution": (avg * weight) / 100,
                    "total_items": int(total_item_weight),
                }

        final_grade = 0.0
        total_weight_used = 0.0
        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            if category in category_scores and weight > 0:
                final_grade += (category_scores[category] * weight) / 100
                total_weight_used += weight

        penalty_per_absence = float(getattr(course, "absence_penalty", 0.0) or 0.0)
        unexcused_absences = 0
        absence_deduction = 0.0

        if penalty_per_absence > 0:
            unexcused_absences = len([a for a in attendance if str(a.status).lower() == "absent"])
            absence_deduction = penalty_per_absence * unexcused_absences
            final_grade = max(0.0, final_grade - absence_deduction)

        gpa = (final_grade / 100.0) * 4.0 if final_grade > 0 else 0
        greek_grade = (final_grade / 100.0) * 20.0 if final_grade > 0 else 0

        return {
            "student_id": student_id,
            "course_id": course.id,
            "course_name": course.course_name,
            "final_grade": round(final_grade, 2),
            "percentage": round(final_grade, 2),
            "gpa": round(gpa, 2),
            "greek_grade": round(greek_grade, 2),
            "letter_grade": self.get_letter_grade(final_grade),
            "total_weight_used": total_weight_used,
            "category_breakdown": category_details,
            "absence_penalty": penalty_per_absence,
            "unexcused_absences": unexcused_absences,
            "absence_deduction": round(absence_deduction, 2),
        }
