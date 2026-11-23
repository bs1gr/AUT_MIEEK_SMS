"""The grade sheets of one course (plan todo 75): what a teacher prints, posts or hands in.

Three kinds, each listing every student of the course, A to Z by surname (accents ignored):

- **assessment**: one exam, lab, project... with each student's score, out of what, and the
  percentage. A student with no grade for it is on the list with an empty score.
- **matrix**: one column per assessment of the course (percentages), then the final grade.
- **categories**: for a course with evaluation rules, one column per rule, under the rule's own
  name and the weight the final grade gives it, holding the average the final grade counted
  (exams by their latest grade, ratings included); a cell the final grade zeroed because of
  absences is flagged in ``forfeited``. For a course without rules, one column per category of
  its grades (a standard name's spellings together, any other name on its own), each the
  weighted mean of its grades, a Midterm or Final Exam by its latest grade (what the final
  grade counts).

The students are the ones the Analytics page counts: live enrollments (not deleted, not dropped)
of active students. The final grade is the Analytics page's too (``AnalyticsOverviewService``):
from the course's evaluation rules, scaled to the work done so far, less the participation and
absence deductions (both on each row); or, when no rule takes a grade, the grades' own mean, each
by its Weight, an exam by its latest grade, less the absence penalty (``grade_basis`` "average";
plan todo 77 point 3). A student over the ΜΙΕΕΚ absence limit fails the course whatever
the grade, and the class figures count them that way.

An **assessment** is every grade of the course with the same name and the same category. Names
are compared without case, accents or repeated spaces, but every other character counts ("C++
Project" is not "C Project"); categories by their exact standard name ("Εργαστήριο" and "Lab Work"
are one; "Θεωρητική Εξέταση" and "Πρακτική Εξέταση" are two, as for the final grade). When
a student has more than one grade for it, the latest one is shown and counted: the latest
date_submitted, then the latest entry, the order the final grade uses for an exam; ``entries``
says how many there are.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date
from statistics import mean, median
from typing import Any, Callable, Dict, List, Optional, Tuple

from fastapi import status
from sqlalchemy.orm import Session

from backend.db.utils import get_by_id_or_404
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names
from backend.services import grade_categories as cats
from backend.services.absence_limit_service import STATUS_INSUFFICIENT
from backend.services.analytics_overview_service import PASS_MARK, AnalyticsOverviewService, EnrollmentFacts
from backend.services.analytics_service import AnalyticsService, normalize_rule_category

KINDS = ("assessment", "matrix", "categories")

# What a student's course result is: passed, failed on the grade, failed on absences, or not yet.
RESULT_PASSED = "passed"
RESULT_FAILED = "failed"
RESULT_FAILED_ABSENCES = "failed_absences"


def _round(value: Optional[float]) -> Optional[float]:
    return None if value is None else round(value, 2)


def _as_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _shown_day(grade: Any) -> Optional[date]:
    """The date a grade is shown with: when it was handed in, else when it was set."""
    return grade.date_submitted or grade.date_assigned


def _latest(grades: List[Any]) -> Any:
    """The grade that counts among several: the final grade's order for an exam."""
    return max(grades, key=lambda g: (g.date_submitted or date.min, g.id))


def _percentage(grade: Any) -> Optional[float]:
    return grade.grade / grade.max_grade * 100 if grade is not None and grade.max_grade else None


def _most_common(values: List[Any]) -> Any:
    """The value used most; on a tie, the one met first."""
    present = [v for v in values if v not in (None, "")]
    return Counter(present).most_common(1)[0][0] if present else None


name_key = cats.fold_name  # an assessment name for comparing: no case, no accents; symbols kept


def assessment_key(name: Any, category: Any) -> str:
    """Stable id of an assessment within a course: its category and its name.

    The category by ``exact_key``: "Lab Work" and "Εργαστήριο" are one, but a "Τελική" under
    "Θεωρητική Εξέταση" and one under "Πρακτική Εξέταση" are two assessments, as the final grade
    keeps them.
    """
    return f"{cats.exact_key(category)}|{name_key(name)}"


def course_result(f: EnrollmentFacts) -> Optional[str]:
    """passed / failed / failed_absences, or None while there is no final grade (ΜΙΕΕΚ rule:
    over the absence limit the course is failed whatever the grade)."""
    if f.absence.get("status") == STATUS_INSUFFICIENT:
        return RESULT_FAILED_ABSENCES
    if f.passing is None:
        return None
    return RESULT_PASSED if f.passing else RESULT_FAILED


def _passes(percentage: float) -> bool:
    """Judged on the figure as it is shown (2 decimals): 9.99999/20 is shown, and passes, as 50."""
    return round(percentage, 2) >= PASS_MARK


def _scores_summary(percentages: List[float], enrolled: int) -> Dict[str, Any]:
    return {
        "enrolled": enrolled,
        "graded": len(percentages),
        "missing": enrolled - len(percentages),
        "average": _round(mean(percentages)) if percentages else None,
        "median": _round(median(percentages)) if percentages else None,
        "highest": _round(max(percentages)) if percentages else None,
        "lowest": _round(min(percentages)) if percentages else None,
        "passed": sum(1 for p in percentages if _passes(p)),
        "failed": sum(1 for p in percentages if not _passes(p)),
    }


def weighted_rules(evaluation_rules: Any) -> List[Tuple[str, float]]:
    """The rules the final grade weighs, with the weight it gives each, in the course's order.

    As ``_calculate_final_grade_from_records`` does: the participation-observation rules leave
    the list and their weight goes to the first Class Participation rule; a rule without a
    category or with no weight counts for nothing.
    """
    rules = [r for r in (evaluation_rules if isinstance(evaluation_rules, list) else []) if isinstance(r, dict)]
    returned = 0.0
    kept: List[Dict[str, Any]] = []
    for rule in rules:
        if normalize_rule_category(rule.get("category")) in AnalyticsService.participation_observations:
            returned += max(0.0, _as_float(rule.get("weight")))
        else:
            kept.append(rule)
    participation = next((r for r in kept if normalize_rule_category(r.get("category")) == "participation"), None)
    found = []
    for rule in kept:
        weight = _as_float(rule.get("weight")) + (returned if rule is participation else 0.0)
        if rule.get("category") and weight > 0:
            found.append((str(rule.get("category")), weight))
    return found


@dataclass
class _CourseData:
    course: Any
    roster: List[EnrollmentFacts]
    students: Dict[int, Any]
    grades: List[Any]


class GradeSheetService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.Student, self.Course, self.Grade = import_names("models", "Student", "Course", "Grade")
        self._overview = AnalyticsOverviewService(db)

    # ------------------------------------------------------------------ loading

    def _load(self, course_id: int) -> _CourseData:
        course = get_by_id_or_404(self.db, self.Course, course_id, error_code=ErrorCode.COURSE_NOT_FOUND)
        facts = self._overview.course_facts(course_id)
        student_ids = [f.student_id for f in facts]
        students: Dict[int, Any] = {}
        grades: List[Any] = []
        if student_ids:
            S, G = self.Student, self.Grade
            students = {s.id: s for s in self.db.query(S).filter(S.id.in_(student_ids))}
            grades = (
                self.db.query(G)
                .filter(G.course_id == course_id, G.student_id.in_(student_ids), G.deleted_at.is_(None))
                .all()
            )

        def surname_first(f: EnrollmentFacts) -> tuple:
            s = students[f.student_id]
            return cats.fold(s.last_name), cats.fold(s.first_name), str(s.student_id or "")

        roster = sorted((f for f in facts if f.student_id in students), key=surname_first)
        return _CourseData(course=course, roster=roster, students=students, grades=grades)

    @staticmethod
    def _course_dict(course: Any) -> Dict[str, Any]:
        return {
            "id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "semester": course.semester,
        }

    @staticmethod
    def _student_dict(student: Any) -> Dict[str, Any]:
        return {
            "id": student.id,
            "student_id": student.student_id,
            "last_name": student.last_name,
            "first_name": student.first_name,
        }

    def _student_row(self, data: _CourseData, f: EnrollmentFacts, number: int) -> Dict[str, Any]:
        return {"number": number, "student": self._student_dict(data.students[f.student_id])}

    @staticmethod
    def _final(f: EnrollmentFacts) -> Dict[str, Any]:
        return {
            "final_grade": _round(f.final_grade),
            "grade_basis": f.grade_basis,
            "result": course_result(f),
            "absence_status": f.absence.get("status"),
            "participation_forfeited": f.participation_forfeited,
            "participation_deduction": _round(f.participation_deduction),
            "absence_deduction": _round(f.absence_deduction),
            # Periods the student came late: attended, not absences, shown for the evaluation.
            "late": f.late,
        }

    @staticmethod
    def _final_summary(roster: List[EnrollmentFacts]) -> Dict[str, Any]:
        finals = [f.final_grade for f in roster if f.final_grade is not None]
        results = [course_result(f) for f in roster]
        return {
            "enrolled": len(roster),
            "final_average": _round(mean(finals)) if finals else None,
            "passed": results.count(RESULT_PASSED),
            "failed": results.count(RESULT_FAILED) + results.count(RESULT_FAILED_ABSENCES),
            "failed_absences": results.count(RESULT_FAILED_ABSENCES),
            "no_grade": results.count(None),
        }

    # ------------------------------------------------------------------ assessments

    def _groups(self, data: _CourseData) -> Dict[str, List[Any]]:
        groups: Dict[str, List[Any]] = {}
        for g in data.grades:
            if g.max_grade:
                groups.setdefault(assessment_key(g.assignment_name, g.category), []).append(g)
        return groups

    def _assessment_list(self, data: _CourseData, groups: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
        found = []
        for key, rows in groups.items():
            dated = sorted(rows, key=lambda g: (_shown_day(g) or date.max, g.id))
            category = _most_common([(g.category or "").strip() for g in dated])
            days = [d for d in (_shown_day(g) for g in dated) if d]
            found.append(
                {
                    "key": key,
                    "name": _most_common([(g.assignment_name or "").strip() for g in dated]) or "",
                    "category": category,
                    "category_key": cats.canonical_category(category),
                    "label_key": cats.standard_key(category),
                    "max_grade": _round(_most_common([g.max_grade for g in dated])),
                    "first_date": min(days).isoformat() if days else None,
                    "last_date": max(days).isoformat() if days else None,
                    "graded": len({g.student_id for g in rows}),
                    "enrolled": len(data.roster),
                }
            )
        found.sort(key=lambda a: (a["first_date"] or "9999-12-31", name_key(a["name"]), a["key"]))
        names = Counter(name_key(a["name"]) for a in found)
        for a in found:
            # Two assessments may share a name under different categories ("Άσκηση 1" as lab work
            # and as homework): whoever shows them must add the category to tell them apart.
            a["shared_name"] = names[name_key(a["name"])] > 1
        return found

    def assessments(self, course_id: int) -> Dict[str, Any]:
        """Every assessment of the course, oldest first, with how many students have a grade."""
        data = self._load(course_id)
        return {
            "course": self._course_dict(data.course),
            "enrolled": len(data.roster),
            "assessments": self._assessment_list(data, self._groups(data)),
        }

    # ------------------------------------------------------------------ sheets

    def assessment_sheet(self, course_id: int, key: str) -> Dict[str, Any]:
        data = self._load(course_id)
        groups = self._groups(data)
        listed = {a["key"]: a for a in self._assessment_list(data, groups)}
        if key not in listed:
            raise http_error(
                status.HTTP_404_NOT_FOUND,
                ErrorCode.GRADE_NOT_FOUND,
                "No grades for this assessment in this course",
            )
        by_student: Dict[int, List[Any]] = {}
        for g in groups[key]:
            by_student.setdefault(g.student_id, []).append(g)

        rows, percentages = [], []
        for number, f in enumerate(data.roster, start=1):
            entries = by_student.get(f.student_id, [])
            latest = _latest(entries) if entries else None
            pct = _percentage(latest)
            if pct is not None:
                percentages.append(pct)
            day = _shown_day(latest) if latest is not None else None
            rows.append(
                {
                    **self._student_row(data, f, number),
                    # Rounded as every other figure, so the page and the PDF print the same digits.
                    "score": _round(latest.grade) if latest is not None else None,
                    "max_grade": _round(latest.max_grade) if latest is not None else None,
                    "percentage": _round(pct),
                    "date": day.isoformat() if day else None,
                    "entries": len(entries),
                    "passed": None if pct is None else _passes(pct),
                }
            )
        return {
            "kind": "assessment",
            "course": self._course_dict(data.course),
            "assessment": listed[key],
            "rows": rows,
            "summary": _scores_summary(percentages, len(data.roster)),
        }

    def matrix(self, course_id: int) -> Dict[str, Any]:
        data = self._load(course_id)
        groups = self._groups(data)
        columns = self._assessment_list(data, groups)
        latest_pct: Dict[tuple[str, int], float] = {}
        for column in columns:
            by_student: Dict[int, List[Any]] = {}
            for g in groups[column["key"]]:
                by_student.setdefault(g.student_id, []).append(g)
            for student_id, entries in by_student.items():
                pct = _percentage(_latest(entries))
                if pct is not None:
                    latest_pct[(column["key"], student_id)] = pct

        rows = []
        for number, f in enumerate(data.roster, start=1):
            cells = [_round(latest_pct.get((c["key"], f.student_id))) for c in columns]
            rows.append({**self._student_row(data, f, number), "cells": cells, **self._final(f)})
        averages = []
        for c in columns:
            values = [
                latest_pct[(c["key"], f.student_id)] for f in data.roster if (c["key"], f.student_id) in latest_pct
            ]
            averages.append(_round(mean(values)) if values else None)
        return {
            "kind": "matrix",
            "course": self._course_dict(data.course),
            "columns": columns,
            "column_averages": averages,
            "rows": rows,
            "summary": self._final_summary(data.roster),
        }

    def category_totals(self, course_id: int) -> Dict[str, Any]:
        """One column per rule when the course has rules, else per category of its grades."""
        data = self._load(course_id)
        rules = weighted_rules(data.course.evaluation_rules)
        if rules:
            columns, cells_of = self._rule_columns(rules)
        else:
            columns, cells_of = self._grade_columns(data)

        rows = []
        for number, f in enumerate(data.roster, start=1):
            cells, forfeited = cells_of(f)
            rows.append(
                {**self._student_row(data, f, number), "cells": cells, "forfeited": forfeited, **self._final(f)}
            )
        averages = []
        for index in range(len(columns)):
            values = [row["cells"][index] for row in rows if row["cells"][index] is not None]
            averages.append(_round(mean(values)) if values else None)
        return {
            "kind": "categories",
            "course": self._course_dict(data.course),
            "basis": "rules" if rules else "grades",
            "columns": columns,
            "column_averages": averages,
            "rows": rows,
            "summary": self._final_summary(data.roster),
        }

    @staticmethod
    def _rule_columns(
        rules: List[Tuple[str, float]],
    ) -> Tuple[List[Dict[str, Any]], Callable[[EnrollmentFacts], Tuple[List[Optional[float]], List[bool]]]]:
        """The averages the final grade is made of, one column per rule, under the rule's name."""
        columns = [
            {
                # Two rules may fold to one standard category ("Midterm 1", "Midterm 2"): the
                # column's place in the rules keeps the key unique.
                "key": f"rule:{index}",
                "category": category,
                "category_key": cats.canonical_category(category),
                "label_key": cats.standard_key(category),
                "weight": _round(weight),
            }
            for index, (category, weight) in enumerate(rules)
        ]

        def cells_of(f: EnrollmentFacts) -> Tuple[List[Optional[float]], List[bool]]:
            figures = [f.category_breakdown.get(category) or {} for category, _ in rules]
            return [_round(d.get("average")) for d in figures], [bool(d.get("forfeited")) for d in figures]

        return columns, cells_of

    @staticmethod
    def _grade_columns(
        data: _CourseData,
    ) -> Tuple[List[Dict[str, Any]], Callable[[EnrollmentFacts], Tuple[List[Optional[float]], List[bool]]]]:
        """A course without rules: each category's weighted mean of the student's grades that
        the final grade counts (``AnalyticsService.counted_grades``, taken over all the student's
        grades: one Midterm and one Final, each by its latest sitting, whatever the grades are
        called; a sitting that does not count is in no column, "Midterm 1" beside its retake
        "Midterm 2" included).

        Nothing is forfeited here: without rules the final grade is the grades' own mean (each by
        its Weight, an exam by its latest grade, less the absence penalty).
        """
        per_student: Dict[int, List[Any]] = {}
        for g in data.grades:
            per_student.setdefault(g.student_id, []).append(g)
        groups: Dict[str, List[Any]] = {}
        for own in per_student.values():
            for g in AnalyticsService.counted_grades(own):
                groups.setdefault(cats.exact_key(g.category), []).append(g)
        keys = sorted(groups, key=cats.sort_position)
        columns = []
        for key in keys:
            category = _most_common([(g.category or "").strip() for g in groups[key]])
            columns.append(
                {
                    "key": key,
                    "category": category,
                    "category_key": cats.canonical_category(category),
                    "label_key": key if key in cats.CATEGORY_KEYS else None,
                    "weight": None,
                }
            )
        by_student: Dict[tuple[str, int], List[Any]] = {}
        for key in keys:
            for g in groups[key]:
                by_student.setdefault((key, g.student_id), []).append(g)

        def cells_of(f: EnrollmentFacts) -> Tuple[List[Optional[float]], List[bool]]:
            cells: List[Optional[float]] = []
            for key in keys:
                mine = by_student.get((key, f.student_id), [])
                total = sum(AnalyticsService.grade_weight(g) for g in mine)
                weighted = sum((_percentage(g) or 0.0) * AnalyticsService.grade_weight(g) for g in mine)
                cells.append(_round(weighted / total) if mine and total else None)
            return cells, [False] * len(keys)

        return columns, cells_of

    def sheet(self, course_id: int, kind: str, key: Optional[str] = None) -> Dict[str, Any]:
        if kind == "assessment":
            if not key:
                raise http_error(
                    status.HTTP_400_BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Choose the assessment to list"
                )
            return self.assessment_sheet(course_id, key)
        if kind == "matrix":
            return self.matrix(course_id)
        return self.category_totals(course_id)
