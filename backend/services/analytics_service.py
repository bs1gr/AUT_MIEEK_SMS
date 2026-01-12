from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from backend.db_utils import get_by_id_or_404
from backend.import_resolver import import_names
from backend.services.cache_service import cached, get_cache_manager

logger = logging.getLogger(__name__)


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
            self.CourseEnrollment,
        ) = import_names("models", "Student", "Course", "Grade", "DailyPerformance", "Attendance", "CourseEnrollment")

    # ----------------------------- Public API ---------------------------------
    def calculate_final_grade(self, student_id: int, course_id: int) -> Dict[str, Any]:
        get_by_id_or_404(self.db, self.Student, student_id)
        course = get_by_id_or_404(self.db, self.Course, course_id)

        # Use separate, simpler queries instead of complex joinedload to avoid lock contention
        grades = [
            g
            for g in self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id, self.Grade.course_id == course_id, self.Grade.deleted_at.is_(None)
            )
            .all()
        ]

        daily = [
            d
            for d in self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.course_id == course_id,
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        ]

        attendance = [
            a
            for a in self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.course_id == course_id,
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        ]

        return self._calculate_final_grade_from_records(student_id, course, grades, daily, attendance)

    def get_student_all_courses_summary(self, student_id: int) -> Dict[str, Any]:
        # Fetch student without expensive joinedloads
        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()

        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)  # Raises 404
        assert student is not None

        # Try to fetch course enrollments first (most efficient)
        enrollments = (
            self.db.query(self.CourseEnrollment)
            .filter(self.CourseEnrollment.student_id == student_id, self.CourseEnrollment.deleted_at.is_(None))
            .all()
        )

        course_ids = {e.course_id for e in enrollments}

        # If no enrollments exist, fall back to finding courses from grades/attendance/daily performance
        if not course_ids:
            course_ids = {
                *(
                    g.course_id
                    for g in self.db.query(self.Grade.course_id)
                    .filter(self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None))
                    .distinct()
                ),
                *(
                    d.course_id
                    for d in self.db.query(self.DailyPerformance.course_id)
                    .filter(self.DailyPerformance.student_id == student_id, self.DailyPerformance.deleted_at.is_(None))
                    .distinct()
                ),
                *(
                    a.course_id
                    for a in self.db.query(self.Attendance.course_id)
                    .filter(self.Attendance.student_id == student_id, self.Attendance.deleted_at.is_(None))
                    .distinct()
                ),
            }

        if not course_ids:
            # No data at all for this student
            return {
                "student": {
                    "id": student.id,
                    "name": f"{student.first_name} {student.last_name}",
                    "student_id": student.student_id,
                },
                "overall_gpa": 0,
                "total_credits": 0,
                "courses": [],
            }

        # Fetch courses in enrolled list only
        courses_dict: Dict[int, Any] = {
            c.id: c
            for c in self.db.query(self.Course)
            .filter(self.Course.id.in_(course_ids), self.Course.deleted_at.is_(None))
            .all()
        }

        # Fetch related data for enrolled courses only
        grades_by_course: Dict[int, List[Any]] = {}
        for grade in (
            self.db.query(self.Grade)
            .filter(
                self.Grade.student_id == student_id,
                self.Grade.course_id.in_(course_ids),
                self.Grade.deleted_at.is_(None),
            )
            .all()
        ):
            grades_by_course.setdefault(grade.course_id, []).append(grade)

        daily_by_course: Dict[int, List[Any]] = {}
        for daily in (
            self.db.query(self.DailyPerformance)
            .filter(
                self.DailyPerformance.student_id == student_id,
                self.DailyPerformance.course_id.in_(course_ids),
                self.DailyPerformance.deleted_at.is_(None),
            )
            .all()
        ):
            daily_by_course.setdefault(daily.course_id, []).append(daily)

        attendance_by_course: Dict[int, List[Any]] = {}
        for att in (
            self.db.query(self.Attendance)
            .filter(
                self.Attendance.student_id == student_id,
                self.Attendance.course_id.in_(course_ids),
                self.Attendance.deleted_at.is_(None),
            )
            .all()
        ):
            attendance_by_course.setdefault(att.course_id, []).append(att)

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
        assert student is not None

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

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Return a small system-wide summary used by the UI/dashboard.

        This is intentionally lightweight for load-testing and health UIs: counts of
        students, courses and basic totals.
        """
        # Use simple count queries; models were resolved in __init__ via import_names
        student_count = self.db.query(self.Student).filter(self.Student.deleted_at.is_(None)).count()
        course_count = self.db.query(self.Course).filter(self.Course.deleted_at.is_(None)).count()
        enrollment_count = (
            self.db.query(self.CourseEnrollment).filter(self.CourseEnrollment.deleted_at.is_(None)).count()
        )

        return {
            "students": int(student_count),
            "courses": int(course_count),
            "enrollments": int(enrollment_count),
        }

    # ----------------------------- Helpers ------------------------------------
    @staticmethod
    def get_letter_grade(percentage: float) -> str:
        """Convert percentage to letter grade using standard academic scale.

        Scale: A+ (97-100), A (93-96), A- (90-92), B+ (87-89), B (83-86),
               B- (80-82), C+ (77-79), C (70-76), D (60-69), F (0-59)
        """
        if percentage >= 97:
            return "A+"
        if percentage >= 93:
            return "A"
        if percentage >= 90:
            return "A-"
        if percentage >= 87:
            return "B+"
        if percentage >= 83:
            return "B"
        if percentage >= 80:
            return "B-"
        if percentage >= 77:
            return "C+"
        if percentage >= 70:
            return "C"
        if percentage >= 60:
            return "D"
        return "F"

    def get_student_performance(self, student_id: int, days_back: int = 90) -> Dict[str, Any]:
        """Get student performance metrics over time (last N days).

        Args:
            student_id: Student ID
            days_back: Number of days to look back (default 90)

        Returns:
            Dictionary with performance trends, course breakdown, and averages
        """
        from datetime import datetime, timedelta
        from sqlalchemy import and_

        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)

        cutoff_date = datetime.utcnow() - timedelta(days=days_back)

        # Get grades in date range
        grades = (
            self.db.query(self.Grade)
            .filter(
                and_(
                    self.Grade.student_id == student_id,
                    self.Grade.deleted_at.is_(None),
                    self.Grade.date_submitted >= cutoff_date,
                )
            )
            .all()
        )

        # Calculate by course
        by_course = {}
        for grade in grades:
            course_id = grade.course_id
            if course_id not in by_course:
                course = self.db.query(self.Course).filter(self.Course.id == course_id).first()
                by_course[course_id] = {
                    "course_code": course.course_code if course else f"Course {course_id}",
                    "course_name": course.course_name if course else f"Course {course_id}",
                    "grades": [],
                }
            if grade.max_grade:
                by_course[course_id]["grades"].append(
                    {
                        "category": grade.category,
                        "percentage": round((grade.grade / grade.max_grade) * 100, 2),
                        "date": grade.date_submitted.isoformat() if grade.date_submitted else None,
                    }
                )

        # Calculate averages per course
        course_averages = {}
        for course_id, data in by_course.items():
            if data["grades"]:
                avg = sum(g["percentage"] for g in data["grades"]) / len(data["grades"])
                course_averages[course_id] = {
                    "course_code": data["course_code"],
                    "course_name": data["course_name"],
                    "average": round(avg, 2),
                    "grade_count": len(data["grades"]),
                    "grades": data["grades"],
                }

        overall_avg = (
            sum(c["average"] for c in course_averages.values()) / len(course_averages) if course_averages else 0
        )

        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "student_id": student.student_id,
            },
            "period_days": days_back,
            "overall_average": round(overall_avg, 2),
            "courses": course_averages,
        }

    def get_student_trends(self, student_id: int, limit: int = 10) -> Dict[str, Any]:
        """Get student performance trends showing improvement/decline over time.

        Args:
            student_id: Student ID
            limit: Maximum number of time periods to show

        Returns:
            Dictionary with trend data, moving averages, and trajectory
        """
        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)

        # Get all grades ordered by date
        grades = (
            self.db.query(self.Grade)
            .filter(self.Grade.student_id == student_id, self.Grade.deleted_at.is_(None))
            .order_by(self.Grade.date_submitted.desc())
            .limit(limit * 3)
            .all()
        )

        if not grades:
            return {
                "student": {"id": student.id, "name": f"{student.first_name} {student.last_name}"},
                "trend_data": [],
                "overall_trend": "stable",
                "moving_average": 0,
            }

        # Convert to percentages and group by submission date
        trend_data = []
        for grade in reversed(grades):
            if grade.max_grade:
                pct = round((grade.grade / grade.max_grade) * 100, 2)
                trend_data.append(
                    {
                        "date": grade.date_submitted.isoformat() if grade.date_submitted else None,
                        "percentage": pct,
                        "category": grade.category,
                    }
                )

        # Calculate moving average (last 5 grades)
        percentages = [t["percentage"] for t in trend_data[-5:]]
        moving_avg = sum(percentages) / len(percentages) if percentages else 0

        # Determine trend direction
        if len(trend_data) >= 2:
            recent = sum(t["percentage"] for t in trend_data[-5:]) / min(5, len(trend_data))
            earlier = sum(t["percentage"] for t in trend_data[:-5]) / max(1, len(trend_data) - 5)
            if recent > earlier + 3:
                trend = "improving"
            elif recent < earlier - 3:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return {
            "student": {"id": student.id, "name": f"{student.first_name} {student.last_name}"},
            "trend_data": trend_data[-limit:],  # Last N grades
            "overall_trend": trend,
            "moving_average": round(moving_avg, 2),
        }

    def get_students_comparison(self, course_id: int, limit: int = 50) -> Dict[str, Any]:
        """Get comparison data for all students in a course.

        Args:
            course_id: Course ID
            limit: Maximum number of students to return

        Returns:
            Dictionary with course info and ranked student performance
        """
        course = self.db.query(self.Course).filter(self.Course.id == course_id).first()
        if not course:
            get_by_id_or_404(self.db, self.Course, course_id)

        # Get all students enrolled in course
        enrollments = (
            self.db.query(self.CourseEnrollment)
            .filter(self.CourseEnrollment.course_id == course_id, self.CourseEnrollment.deleted_at.is_(None))
            .all()
        )

        student_ids = [e.student_id for e in enrollments]

        # Calculate grades for each student
        student_stats = []
        for student_id in student_ids:
            grades = (
                self.db.query(self.Grade)
                .filter(
                    self.Grade.student_id == student_id,
                    self.Grade.course_id == course_id,
                    self.Grade.deleted_at.is_(None),
                )
                .all()
            )

            if grades:
                avg_pct = sum((g.grade / g.max_grade) * 100 for g in grades if g.max_grade) / len(grades)
                student = self.db.query(self.Student).filter(self.Student.id == student_id).first()
                if student:
                    student_stats.append(
                        {
                            "student_id": student.student_id,
                            "student_name": f"{student.first_name} {student.last_name}",
                            "average_percentage": round(avg_pct, 2),
                            "grade_count": len(grades),
                            "letter_grade": self.get_letter_grade(avg_pct),
                        }
                    )

        # Sort by average descending
        student_stats.sort(key=lambda s: s["average_percentage"], reverse=True)

        # Calculate class statistics
        if student_stats:
            percentages = [s["average_percentage"] for s in student_stats]
            class_avg = sum(percentages) / len(percentages)
            class_median = sorted(percentages)[len(percentages) // 2]
            class_min = min(percentages)
            class_max = max(percentages)
        else:
            class_avg = class_median = class_min = class_max = 0

        return {
            "course": {"id": course.id, "code": course.course_code, "name": course.course_name},
            "class_statistics": {
                "average": round(class_avg, 2),
                "median": round(class_median, 2),
                "min": round(class_min, 2),
                "max": round(class_max, 2),
                "student_count": len(student_stats),
            },
            "students": student_stats[:limit],
        }

    def get_attendance_summary(self, student_id: int, course_id: Optional[int] = None) -> Dict[str, Any]:
        """Get attendance summary for a student (all courses or specific course).

        Args:
            student_id: Student ID
            course_id: Optional course ID (if None, returns all courses)

        Returns:
            Dictionary with attendance rates and details
        """
        student = self.db.query(self.Student).filter(self.Student.id == student_id).first()
        if not student:
            get_by_id_or_404(self.db, self.Student, student_id)

        query = self.db.query(self.Attendance).filter(
            self.Attendance.student_id == student_id, self.Attendance.deleted_at.is_(None)
        )

        if course_id:
            query = query.filter(self.Attendance.course_id == course_id)

        attendance_records = query.all()

        # Group by course
        by_course = {}
        for record in attendance_records:
            course_id = record.course_id
            if course_id not in by_course:
                course = self.db.query(self.Course).filter(self.Course.id == course_id).first()
                by_course[course_id] = {
                    "course_code": course.course_code if course else f"Course {course_id}",
                    "course_name": course.course_name if course else f"Course {course_id}",
                    "attendance_records": [],
                }
            by_course[course_id]["attendance_records"].append(
                {"date": record.date.isoformat() if record.date else None, "status": record.status}
            )

        # Calculate rates
        course_summaries = {}
        for course_id, data in by_course.items():
            records = data["attendance_records"]
            total = len(records)
            present = len([r for r in records if r["status"].lower() == "present"])
            absent = len([r for r in records if r["status"].lower() == "absent"])
            late = len([r for r in records if r["status"].lower() == "late"])

            course_summaries[course_id] = {
                "course_code": data["course_code"],
                "course_name": data["course_name"],
                "total_classes": total,
                "present": present,
                "absent": absent,
                "late": late,
                "attendance_rate": round((present / total * 100), 2) if total > 0 else 0,
            }

        # Overall summary
        all_records = attendance_records
        total_all = len(all_records)
        present_all = len([r for r in all_records if r.status.lower() == "present"])

        return {
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "student_id": student.student_id,
            },
            "overall_attendance_rate": round((present_all / total_all * 100), 2) if total_all > 0 else 0,
            "total_classes": total_all,
            "courses": course_summaries,
        }

    def get_grade_distribution(self, course_id: int) -> Dict[str, Any]:
        """Get grade distribution for a course (histogram data).

        Args:
            course_id: Course ID

        Returns:
            Dictionary with grade distribution buckets
        """
        course = self.db.query(self.Course).filter(self.Course.id == course_id).first()
        if not course:
            get_by_id_or_404(self.db, self.Course, course_id)

        # Get all grades for course
        grades = (
            self.db.query(self.Grade).filter(self.Grade.course_id == course_id, self.Grade.deleted_at.is_(None)).all()
        )

        if not grades:
            return {
                "course": {"id": course.id, "code": course.course_code, "name": course.course_name},
                "distribution": {},
                "total_grades": 0,
            }

        # Calculate percentages and bucket them
        buckets = {"A (90-100%)": 0, "B (80-89%)": 0, "C (70-79%)": 0, "D (60-69%)": 0, "F (0-59%)": 0}

        percentages = []
        for grade in grades:
            if grade.max_grade:
                pct = (grade.grade / grade.max_grade) * 100
                percentages.append(pct)

                if pct >= 90:
                    buckets["A (90-100%)"] += 1
                elif pct >= 80:
                    buckets["B (80-89%)"] += 1
                elif pct >= 70:
                    buckets["C (70-79%)"] += 1
                elif pct >= 60:
                    buckets["D (60-69%)"] += 1
                else:
                    buckets["F (0-59%)"] += 1

        # Convert to percentages
        total = len(percentages)
        distribution = {k: round((v / total * 100), 2) if total > 0 else 0 for k, v in buckets.items()}

        avg_pct = sum(percentages) / len(percentages) if percentages else 0

        return {
            "course": {"id": course.id, "code": course.course_code, "name": course.course_name},
            "distribution": distribution,
            "average_percentage": round(avg_pct, 2),
            "total_grades": total,
        }

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

        def _normalize_category(name: Optional[str]) -> str:
            """Normalize category names to improve matching between evaluation rules and recorded items.

            Handles case-insensitive comparisons, common synonyms, and Greek equivalents.
            """
            if not name:
                return ""
            n = str(name).strip().lower()
            # Remove common punctuation
            for ch in [":", ";", ",", ".", "-", "_", "(", ")"]:
                n = n.replace(ch, " ")
            n = " ".join(n.split())  # collapse whitespace

            # Synonyms map (both EN and EL)
            synonyms = {
                # Exams
                "midterm exam": "midterm",
                "midterm": "midterm",
                "intermediate": "midterm",
                "ενδιάμεση": "midterm",
                "ενδιάμεση εξέταση": "midterm",
                "ενδιάμεση εξεταση": "midterm",
                "final exam": "final",
                "final": "final",
                "τελική": "final",
                "τελική εξέταση": "final",
                "τελικη": "final",
                "τελικη εξεταση": "final",
                # Coursework
                "homework": "homework",
                "assignment": "homework",
                "assignments": "homework",
                "εργασία": "homework",
                "εργασια": "homework",
                "άσκηση": "homework",
                "ασκηση": "homework",
                "project": "project",
                "πρότζεκτ": "project",
                "προτζεκτ": "project",
                "lab": "lab",
                "lab work": "lab",
                "εργαστήριο": "lab",
                "εργαστηριο": "lab",
                "quiz": "quiz",
                "κουίζ": "quiz",
                "κουιζ": "quiz",
                # Participation / attendance
                "class participation": "participation",
                "participation": "participation",
                "συμμετοχή": "participation",
                "συμμετοχη": "participation",
                "attendance": "attendance",
                "παρουσία": "attendance",
                "παρουσια": "attendance",
            }

            # Direct map
            if n in synonyms:
                return synonyms[n]

            # Heuristic contains-based mapping
            contains_map = {
                "midterm": ["midterm", "ενδιάμεση", "ενδιαμεση"],
                "final": ["final", "τελική", "τελικη"],
                "homework": ["homework", "assignment", "εργασ", "άσκη", "ασκη"],
                "project": ["project", "πρότζεκ", "προτζεκ"],
                "lab": ["lab", "εργαστηρ"],
                "quiz": ["quiz", "κουιζ", "κουίζ", "τεστ"],
                "participation": ["participation", "συμμετο"],
                "attendance": ["attendance", "παρουσ"],
            }
            for key, needles in contains_map.items():
                if any(needle in n for needle in needles):
                    return key
            return n

        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            include_daily = rule.get("includeDailyPerformance", True)
            daily_multiplier = float(rule.get("dailyPerformanceMultiplier", 1.0))

            if not category or weight <= 0:
                continue

            weighted_sum = 0.0
            total_item_weight = 0.0

            category_lower = (category or "").lower()
            # Match grades to this rule category using normalized names
            rule_norm = _normalize_category(category)
            category_grades = [gr for gr in grades if _normalize_category(getattr(gr, "category", None)) == rule_norm]

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
                for perf in (
                    p for p in daily_performance if _normalize_category(getattr(p, "category", None)) == rule_norm
                ):
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

        # Calculate final grade based on COMPLETED work only
        # Normalize by total weight of categories with actual grades/data
        final_grade = 0.0
        total_weight_used = 0.0
        for rule in evaluation_rules:
            category = rule.get("category")
            weight = float(rule.get("weight", 0))
            if category in category_scores and weight > 0:
                final_grade += (category_scores[category] * weight) / 100
                total_weight_used += weight

        # Normalize to 100% scale based on completed work
        # If only 40% of work is done, scale up to show current performance out of 100%
        if total_weight_used > 0 and total_weight_used < 100:
            final_grade = (final_grade / total_weight_used) * 100

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

    # ----------------------------- Cache Invalidation ---------------------------------
    def invalidate_cache_for_student(self, student_id: int, course_id: Optional[int] = None) -> None:
        """Invalidate analytics cache when student data changes.

        Args:
            student_id: Student ID
            course_id: Optional specific course ID (if None, invalidates all courses)
        """
        cache = get_cache_manager()
        
        if course_id:
            # Specific course invalidation
            cache.invalidate_student_cache(student_id)
            cache.invalidate_course_cache(course_id)
        else:
            # Full student invalidation
            cache.invalidate_student_cache(student_id)
        
        logger.debug("Invalidated analytics cache: student_id=%d, course_id=%s", student_id, course_id)

    def invalidate_cache_for_course(self, course_id: int) -> None:
        """Invalidate analytics cache when course data changes.

        Args:
            course_id: Course ID
        """
        cache = get_cache_manager()
        cache.invalidate_course_cache(course_id)
        logger.debug("Invalidated analytics cache: course_id=%d", course_id)

    @staticmethod
    def clear_all_cache() -> None:
        """Clear all analytics cache (admin operation only)."""
        cache = get_cache_manager()
        cache.delete_pattern("analytics:*")
        logger.info("Cleared all analytics cache")

