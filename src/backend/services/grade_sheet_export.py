"""The grade sheets (``grade_sheet_service``) as a printable PDF and as an Excel sheet.

The PDF is meant to be handed in or posted: the course, the assessment and the teacher at the
top, one numbered line per student with the registration number, the class figures and the notes
that explain them under the table, and a line to sign. On the one-assessment sheet the remarks
column is for writing in; it says so when a student has several grades for the assessment.

A sheet with more columns than a landscape page holds is printed in column groups: each group
repeats the student columns and the final grade, so no figure runs off the paper.

Excel holds the same table with numbers as numbers. What the PDF says with a mark, Excel says in a
column of its own (the absence limit; whether a final grade came from the rules) or in the cell's
number format (a category zeroed for absences is the number 0, shown as "0 (absences)").
"""

from __future__ import annotations

import math
import os
import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from xml.sax.saxutils import escape

from backend.services import grade_categories as cats
from backend.services.grade_sheet_service import RESULT_FAILED_ABSENCES

FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")
FONT_REGULAR = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"

PDF_MEDIA_TYPE = "application/pdf"
EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

LABELS: Dict[str, Dict[str, str]] = {
    "en": {
        "title_assessment": "Grade sheet",
        "title_matrix": "Course grades: every assessment",
        "title_categories": "Course grades by category",
        "tab_assessment": "Assessment",
        "tab_matrix": "All assessments",
        "tab_categories": "By category",
        "course": "Course",
        "semester": "Semester",
        "assessment": "Assessment",
        "category": "Category",
        "dates": "Date",
        "out_of": "Out of",
        "teacher": "Teacher",
        "generated": "Generated on",
        "number": "#",
        "reg_no": "Reg. no.",
        "surname": "Surname",
        "first_name": "First name",
        "score": "Score",
        "percent": "%",
        "remarks": "Remarks",
        "final": "Final grade",
        "deductions": "Deductions",
        "late": "Late",
        "late_note": "Late: periods the student arrived late. They count as attended, not as absences; "
        "shown for the teacher's evaluation.",
        "absence_limit": "Absence limit",
        "over_limit_short": "over the limit",
        "final_from": "Final grade from",
        "from_rules": "evaluation rules",
        "from_average": "mean of the grades",
        "average": "Average",
        "summary_assessment": "Graded: {graded} of {enrolled}. Average {average}, median {median}, "
        "highest {highest}, lowest {lowest}. Passed {passed}, failed {failed}.",
        "summary_final": "Students: {enrolled}. Class average {final_average}. Passed {passed}, failed {failed}, "
        "no grade yet {no_grade}.",
        "summary_final_absences": "Students: {enrolled}. Class average {final_average}. Passed {passed}, "
        "failed {failed} ({failed_absences} of them over the absence limit), no grade yet {no_grade}.",
        "basis_rules": "One column per evaluation rule of the course: the average the final grade counts.",
        "basis_grades": "This course has no evaluation rules: each category is the mean of its grades.",
        "deductions_note": "Deductions: points the final grade loses for participation observations and "
        "unexcused absences.",
        "final_rules": "Final grade so far: from the course's evaluation rules, scaled to the work graded so far.",
        "final_average": "Final grade: the mean of the student's grades (no evaluation rule applies).",
        "final_average_marked": "† No evaluation rule matched these grades: the final grade is their mean.",
        "over_limit": "* Over the absence limit: the course is failed whatever the grade.",
        "forfeited_suffix": "(absences)",
        "forfeited_mark": "0 ‡",
        "forfeited_note": "‡ Over the Class Participation absence limit: the category counts 0.",
        # Excel has no marks: its notes point at the columns and cells that say the same.
        "over_limit_excel": 'Absence limit "over the limit": the course is failed whatever the grade.',
        "final_average_excel": 'Final grade from "mean of the grades": no evaluation rule matched these '
        "grades, so the final grade is their mean.",
        "forfeited_note_excel": '"0 (absences)": over the Class Participation absence limit, the category counts 0.',
        "no_columns_ratings": "No assessment has been graded yet: the final grades so far come from the daily ratings.",
        "entries": "{count} grades, the latest shown",
        "columns_part": "Columns {first}-{last} of {total}",
        "signature": "Teacher's signature",
        "sign_date": "Date",
        "page": "Page {number}",
        "empty": "No students are enrolled in this course.",
        "no_columns": "Nothing has been graded in this course yet.",
    },
    "el": {
        "title_assessment": "Κατάσταση βαθμολογίας",
        "title_matrix": "Βαθμολογία μαθήματος: όλες οι αξιολογήσεις",
        "title_categories": "Βαθμολογία μαθήματος ανά κατηγορία",
        "tab_assessment": "Αξιολόγηση",
        "tab_matrix": "Όλες οι αξιολογήσεις",
        "tab_categories": "Ανά κατηγορία",
        "course": "Μάθημα",
        "semester": "Εξάμηνο",
        "assessment": "Αξιολόγηση",
        "category": "Κατηγορία",
        "dates": "Ημερομηνία",
        "out_of": "Με άριστα",
        "teacher": "Καθηγητής/τρια",
        "generated": "Ημερομηνία έκδοσης",
        "number": "Α/Α",
        "reg_no": "Αρ. Μητρώου",
        "surname": "Επώνυμο",
        "first_name": "Όνομα",
        "score": "Βαθμός",
        "percent": "%",
        "remarks": "Παρατηρήσεις",
        "final": "Τελικός βαθμός",
        "deductions": "Αφαιρέσεις",
        "late": "Αργοπορίες",
        "late_note": "Αργοπορίες: ώρες που ο σπουδαστής ήρθε αργά. Μετρούν ως παρουσία, όχι ως απουσία· "
        "φαίνονται για την αξιολόγηση του καθηγητή.",
        "absence_limit": "Όριο απουσιών",
        "over_limit_short": "πάνω από το όριο",
        "final_from": "Τελικός βαθμός από",
        "from_rules": "κανόνες αξιολόγησης",
        "from_average": "μέσο όρο βαθμών",
        "average": "Μέσος όρος",
        "summary_assessment": "Βαθμολογήθηκαν: {graded} από {enrolled}. Μέσος όρος {average}, διάμεσος {median}, "
        "υψηλότερος {highest}, χαμηλότερος {lowest}. Επιτυχόντες {passed}, αποτυχόντες {failed}.",
        "summary_final": "Σπουδαστές: {enrolled}. Μέσος όρος τάξης {final_average}. Επιτυχόντες {passed}, "
        "αποτυχόντες {failed}, χωρίς βαθμό ακόμη {no_grade}.",
        "summary_final_absences": "Σπουδαστές: {enrolled}. Μέσος όρος τάξης {final_average}. Επιτυχόντες {passed}, "
        "αποτυχόντες {failed} (εκ των οποίων {failed_absences} λόγω ορίου απουσιών), χωρίς βαθμό ακόμη {no_grade}.",
        "basis_rules": "Μία στήλη για κάθε κανόνα αξιολόγησης του μαθήματος: ο μέσος όρος που μετρά ο τελικός βαθμός.",
        "basis_grades": "Το μάθημα δεν έχει κανόνες αξιολόγησης: κάθε κατηγορία είναι ο μέσος όρος των βαθμών της.",
        "deductions_note": "Αφαιρέσεις: μονάδες που χάνει ο τελικός βαθμός για παρατηρήσεις συμμετοχής και "
        "αδικαιολόγητες απουσίες.",
        "final_rules": "Τελικός βαθμός μέχρι στιγμής: από τους κανόνες αξιολόγησης του μαθήματος, αναγόμενος "
        "στη βαθμολογημένη ως τώρα εργασία.",
        "final_average": "Τελικός βαθμός: ο μέσος όρος των βαθμών του σπουδαστή (δεν ισχύει κανόνας αξιολόγησης).",
        "final_average_marked": "† Κανένας κανόνας αξιολόγησης δεν αντιστοιχεί σε αυτούς τους βαθμούς: "
        "ο τελικός βαθμός είναι ο μέσος όρος τους.",
        "over_limit": "* Πάνω από το όριο απουσιών: το μάθημα δεν περνά, όποιος κι αν είναι ο βαθμός.",
        "forfeited_suffix": "(απουσίες)",
        "forfeited_mark": "0 ‡",
        "forfeited_note": "‡ Πάνω από το όριο απουσιών της Συμμετοχής στο Μάθημα: η κατηγορία μετρά 0.",
        "over_limit_excel": "Όριο απουσιών «πάνω από το όριο»: το μάθημα δεν περνά, όποιος κι αν είναι ο βαθμός.",
        "final_average_excel": "Τελικός βαθμός από «μέσο όρο βαθμών»: κανένας κανόνας αξιολόγησης δεν "
        "αντιστοιχεί σε αυτούς τους βαθμούς, οπότε ο τελικός βαθμός είναι ο μέσος όρος τους.",
        "forfeited_note_excel": "«0 (απουσίες)»: πάνω από το όριο απουσιών της Συμμετοχής στο Μάθημα, "
        "η κατηγορία μετρά 0.",
        "no_columns_ratings": "Δεν έχει βαθμολογηθεί ακόμη καμία αξιολόγηση: οι τελικοί βαθμοί ως τώρα "
        "προκύπτουν από τις ημερήσιες αξιολογήσεις.",
        "entries": "{count} βαθμοί, φαίνεται ο τελευταίος",
        "columns_part": "Στήλες {first}-{last} από {total}",
        "signature": "Υπογραφή καθηγητή/τριας",
        "sign_date": "Ημερομηνία",
        "page": "Σελίδα {number}",
        "empty": "Δεν υπάρχουν εγγεγραμμένοι σπουδαστές σε αυτό το μάθημα.",
        "no_columns": "Δεν έχει βαθμολογηθεί τίποτα ακόμη σε αυτό το μάθημα.",
    },
}

# Characters an .xlsx cell cannot hold (same set openpyxl rejects with IllegalCharacterError).
_ILLEGAL_XLSX = re.compile(r"[\000-\010]|[\013-\014]|[\016-\037]")

# Greek to Latin letters for file names (HTTP headers are latin-1), after accents are dropped.
_GREEK_TO_LATIN = {
    "α": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i", "θ": "th",
    "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o", "π": "p",
    "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y", "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o",
}  # fmt: skip

# The PDF's column widths, in millimetres. Every word of a fixed column's header fits whole at
# the smallest header size (5.5 pt). The Late column is as wide as its header needs, by language:
# "Late" fits 14 mm, "Αργοπορίες" needs 16 (at 14 it printed "Αργοπορί" / "ες"). Every millimetre
# more comes out of the value columns, so English keeps 14. A sheet of three value columns and a
# Late stays portrait in both.
_MM_NUMBER, _MM_REG, _MM_SURNAME, _MM_FIRST = 10.0, 20.0, 32.0, 26.0
_MM_FINAL, _MM_DEDUCTIONS = 18.0, 18.0
_MM_LATE = {"en": 14.0, "el": 16.0}
# A value column: at least 13 mm (else the next column group), at most 30; the page turns to
# landscape once portrait would leave the columns under 20 mm, where headers start to shrink.
_MM_VALUE_MIN, _MM_VALUE_COMFORT, _MM_VALUE_MAX = 13.0, 20.0, 30.0


class PdfUnavailable(RuntimeError):
    """reportlab is not installed in this build."""


def resolve_lang(query_lang: Optional[str], accept_language: Optional[str]) -> str:
    """'el' or 'en': the explicit ?lang= wins, then the browser's Accept-Language."""
    if query_lang and query_lang.lower()[:2] in LABELS:
        return query_lang.lower()[:2]
    return "el" if "el" in (accept_language or "").lower() else "en"


def _ascii_slug(text: Any, limit: int) -> str:
    """Letters and digits for a file name: accents dropped, Greek in Latin letters ("Τελική" -> "Teliki")."""
    out = []
    for ch in unicodedata.normalize("NFD", str(text or "")):
        if unicodedata.combining(ch):
            continue
        low = ch.lower()
        latin = _GREEK_TO_LATIN.get(low)
        out.append(ch if latin is None else (latin.upper() if ch != low else latin))
    return re.sub(r"[^A-Za-z0-9]+", "_", "".join(out)).strip("_")[:limit].rstrip("_")


def export_filename(sheet: Dict[str, Any], extension: str, today: Optional[date] = None) -> str:
    """grade_sheet_<course code>_<kind>[_<assessment>]_<date>.<ext>, in ASCII."""
    course = sheet["course"]
    code = _ascii_slug(course.get("course_code"), 30) or f"course{course.get('id')}"
    parts = ["grade_sheet", code, sheet["kind"]]
    if sheet["kind"] == "assessment":
        a = sheet["assessment"]
        # "C++ Project" and "C# Project" are two assessments: their names must stay two names.
        spelled = str(a.get("name") or "").replace("+", " plus ").replace("#", " sharp ")
        name = _ascii_slug(spelled, 40)
        if a.get("shared_name"):  # the same name under two categories: add the category
            name = "_".join(p for p in (name, _ascii_slug(a.get("category"), 20)) if p)
        if name:
            parts.append(name)
    parts.append((today or date.today()).strftime("%Y%m%d"))
    return "_".join(parts) + f".{extension}"


# ---------------------------------------------------------------------------
# What both formats show
# ---------------------------------------------------------------------------


def _labels(lang: str) -> Dict[str, str]:
    return LABELS.get(lang, LABELS["en"])


def _day(iso: Optional[str]) -> str:
    return date.fromisoformat(iso).strftime("%d/%m/%Y") if iso else ""


def _number(value: Optional[float]) -> str:
    if value is None:
        return ""
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _as_text(value: Any) -> str:
    if isinstance(value, float):
        return _number(value)
    return "" if value is None else str(value)


def _course_title(course: Dict[str, Any]) -> str:
    code = (course.get("course_code") or "").strip()
    name = (course.get("course_name") or "").strip()
    return " - ".join(p for p in (code, name) if p)


def _title(sheet: Dict[str, Any], labels: Dict[str, str]) -> str:
    return labels[f"title_{sheet['kind']}"]


def _date_range(first: Optional[str], last: Optional[str]) -> str:
    if first and last and first != last:
        return f"{_day(first)} - {_day(last)}"
    return _day(first or last)


def _heading_lines(
    sheet: Dict[str, Any], labels: Dict[str, str], lang: str, teacher: Optional[str]
) -> List[Tuple[str, str]]:
    lines = [(labels["course"], _course_title(sheet["course"]))]
    if sheet["course"].get("semester"):
        lines.append((labels["semester"], str(sheet["course"]["semester"])))
    if sheet["kind"] == "assessment":
        a = sheet["assessment"]
        lines.append((labels["assessment"], a["name"]))
        if a.get("category"):
            lines.append((labels["category"], cats.category_label(a["category"], lang)))
        when = _date_range(a.get("first_date"), a.get("last_date"))
        if when:
            lines.append((labels["dates"], when))
        if a.get("max_grade"):
            lines.append((labels["out_of"], _number(a["max_grade"])))
    lines.append((labels["teacher"], teacher or ""))
    lines.append((labels["generated"], date.today().strftime("%d/%m/%Y")))
    return lines


def _column_titles(sheet: Dict[str, Any], lang: str) -> List[str]:
    """The value columns' titles; titles that would still read the same get a number."""
    titles = []
    for column in sheet["columns"]:
        if sheet["kind"] == "matrix":
            title = column["name"] or "-"
            if column.get("shared_name"):
                title = f"{title} ({cats.category_label(column.get('category'), lang) or '-'})"
        else:
            if sheet.get("basis") == "rules":
                label = cats.category_label(column.get("category"), lang)
            else:
                label = cats.group_label(column["key"], column.get("category"), lang)
            title = label or "-"
            if column.get("weight") is not None:
                title = f"{title} ({_number(column['weight'])}%)"
        titles.append(title)
    seen: Dict[str, int] = {}
    repeated = {t for t in titles if titles.count(t) > 1}
    numbered = []
    for title in titles:
        if title in repeated:
            seen[title] = seen.get(title, 0) + 1
            title = f"{title} [{seen[title]}]"
        numbered.append(title)
    return numbered


def _has_deductions(sheet: Dict[str, Any]) -> bool:
    return sheet["kind"] == "categories" and any(
        (r.get("participation_deduction") or 0) + (r.get("absence_deduction") or 0) > 0 for r in sheet["rows"]
    )


def _has_late(sheet: Dict[str, Any]) -> bool:
    """A Late column, on the sheets that end in the final grade, once anyone has a Late (plan
    todo 77: a Late is attended, and the teacher weighs it in the final evaluation)."""
    return sheet["kind"] != "assessment" and any(r.get("late") for r in sheet["rows"])


def _over_limit(sheet: Dict[str, Any]) -> bool:
    return sheet["kind"] != "assessment" and any(r.get("result") == RESULT_FAILED_ABSENCES for r in sheet["rows"])


def _bases(sheet: Dict[str, Any]) -> set:
    """Where the final grades on the sheet came from: "rules", "average", or both."""
    return {r.get("grade_basis") for r in sheet["rows"] if r.get("final_grade") is not None} - {None}


def _final_text(row: Dict[str, Any], mixed: bool) -> str:
    text = _number(row.get("final_grade"))
    marks = ""
    if mixed and text and row.get("grade_basis") == "average":
        marks += " †"
    if row.get("result") == RESULT_FAILED_ABSENCES:
        marks += " *"
    if marks and not text:
        text = "-"
    return text + marks


@dataclass
class _Cell:
    value: Any  # what Excel holds: a number, a text or nothing
    text: str  # what the PDF prints
    excel_format: Optional[str] = None  # an Excel number format, e.g. a number shown with a word


def _cell(value: Any, text: Optional[str] = None, excel_format: Optional[str] = None) -> _Cell:
    return _Cell(value, _as_text(value) if text is None else text, excel_format)


@dataclass
class _Column:
    title: str
    part: str  # "lead" (the student), "value" (the sheet's figures) or "tail" (the result)
    width_mm: float = 0.0  # lead and tail columns in the PDF; value columns share the rest
    pdf: bool = True  # False: Excel only (it says what the PDF says with a mark)
    excel_width: float = 14.0


def _grid(
    sheet: Dict[str, Any], labels: Dict[str, str], lang: str
) -> Tuple[List[_Column], List[List[_Cell]], List[_Cell]]:
    """The table of both formats: its columns, one row per student, and the averages row."""
    if sheet["kind"] == "assessment":
        a = sheet["assessment"]
        columns = [
            _Column(labels["number"], "lead", 11, excel_width=6),
            _Column(labels["reg_no"], "lead", 22, excel_width=12),
            _Column(labels["surname"], "lead", 38, excel_width=22),
            _Column(labels["first_name"], "lead", 34, excel_width=18),
            _Column(labels["score"], "lead", 20, excel_width=10),
            _Column(labels["out_of"], "lead", 0, pdf=False, excel_width=10),
            _Column(labels["percent"], "lead", 14, excel_width=8),
            _Column(labels["remarks"], "tail", 0, excel_width=34),
        ]
        rows = []
        for r in sheet["rows"]:
            s = r["student"]
            score_text = _number(r["score"])
            if r["score"] is not None and r.get("max_grade") is not None and r["max_grade"] != a.get("max_grade"):
                # Not out of the assessment's usual maximum: say out of what.
                score_text = f"{score_text} / {_number(r['max_grade'])}"
            remark = labels["entries"].format(count=r["entries"]) if r["entries"] > 1 else ""
            rows.append(
                [
                    _cell(r["number"]),
                    _cell(s["student_id"]),
                    _cell(s["last_name"]),
                    _cell(s["first_name"]),
                    _cell(r["score"], score_text),
                    _cell(r.get("max_grade")),
                    _cell(r["percentage"]),
                    _cell(remark),
                ]
            )
        blank = _cell(None)
        averages = [
            blank,
            blank,
            _cell(labels["average"]),
            blank,
            blank,
            blank,
            _cell(sheet["summary"]["average"]),
            blank,
        ]
        return columns, rows, averages

    deductions, over_limit, late = _has_deductions(sheet), _over_limit(sheet), _has_late(sheet)
    bases = _bases(sheet)
    mixed = len(bases) > 1
    columns = [
        _Column(labels["number"], "lead", _MM_NUMBER, excel_width=6),
        _Column(labels["reg_no"], "lead", _MM_REG, excel_width=12),
        _Column(labels["surname"], "lead", _MM_SURNAME, excel_width=22),
        _Column(labels["first_name"], "lead", _MM_FIRST, excel_width=18),
    ]
    columns += [_Column(title, "value") for title in _column_titles(sheet, lang)]
    if late:
        # Excel 12 wide, as Deductions: at 10 Excel too breaks "Αργοπορίες" in two.
        columns.append(_Column(labels["late"], "tail", _MM_LATE.get(lang, _MM_LATE["en"]), excel_width=12))
    if deductions:
        columns.append(_Column(labels["deductions"], "tail", _MM_DEDUCTIONS, excel_width=12))
    columns.append(_Column(labels["final"], "tail", _MM_FINAL, excel_width=12))
    if over_limit:
        columns.append(_Column(labels["absence_limit"], "tail", pdf=False, excel_width=18))
    if mixed:
        columns.append(_Column(labels["final_from"], "tail", pdf=False, excel_width=20))

    rows = []
    for r in sheet["rows"]:
        s = r["student"]
        forfeited = r.get("forfeited") or [False] * len(r["cells"])
        # A cell the final grade zeroed because of absences (the engine's own flag): a mark and its
        # footnote in the PDF's narrow column; in Excel the number 0, shown as "0 (absences)", so
        # that Excel's own sums and averages agree with the sheet's.
        zeroed_format = f'0 "{labels["forfeited_suffix"]}"'
        values = [
            _cell(0.0, labels["forfeited_mark"], zeroed_format) if sheet["kind"] == "categories" and lost else _cell(v)
            for v, lost in zip(r["cells"], forfeited)
        ]
        tail = []
        if late:
            tail.append(_cell(r.get("late") or None))
        if deductions:
            lost_points = (r.get("participation_deduction") or 0) + (r.get("absence_deduction") or 0)
            tail.append(_cell(-round(lost_points, 2) if lost_points else None))
        tail.append(_cell(r.get("final_grade"), _final_text(r, mixed)))
        if over_limit:
            tail.append(_cell(labels["over_limit_short"] if r.get("result") == RESULT_FAILED_ABSENCES else None))
        if mixed:
            basis = r.get("grade_basis")
            tail.append(_cell({"rules": labels["from_rules"], "average": labels["from_average"]}.get(basis)))
        lead = [_cell(r["number"]), _cell(s["student_id"]), _cell(s["last_name"]), _cell(s["first_name"])]
        rows.append(lead + values + tail)

    blank = _cell(None)
    averages = [blank, blank, _cell(labels["average"]), blank] + [_cell(v) for v in sheet["column_averages"]]
    averages += [blank] if late else []
    averages += [blank] if deductions else []
    averages += [_cell(sheet["summary"]["final_average"])]
    averages += [blank] if over_limit else []
    averages += [blank] if mixed else []
    return columns, rows, averages


def _notes(sheet: Dict[str, Any], labels: Dict[str, str], excel: bool = False) -> List[str]:
    """The lines under the table. For Excel, the notes about marks point at the columns and
    cells that say the same instead (an Excel cell carries no *, † or ‡)."""
    summary = sheet["summary"]
    figures = {k: (_number(v) if isinstance(v, float) else ("-" if v is None else v)) for k, v in summary.items()}
    if sheet["kind"] == "assessment":
        return [labels["summary_assessment"].format(**figures)]
    notes = [labels["summary_final_absences" if summary.get("failed_absences") else "summary_final"].format(**figures)]
    if sheet["kind"] == "categories":
        notes.append(labels["basis_rules"] if sheet.get("basis") == "rules" else labels["basis_grades"])
    if _has_late(sheet):
        notes.append(labels["late_note"])
    if _has_deductions(sheet):
        notes.append(labels["deductions_note"])
    bases = _bases(sheet)
    if "rules" in bases:
        notes.append(labels["final_rules"])
    if "average" in bases:
        if "rules" in bases:  # mixed: the rows graded by the mean are marked (PDF) or named (Excel)
            notes.append(labels["final_average_excel" if excel else "final_average_marked"])
        else:
            notes.append(labels["final_average"])
    if _over_limit(sheet):
        notes.append(labels["over_limit_excel" if excel else "over_limit"])
    if sheet["kind"] == "categories" and any(any(r.get("forfeited") or []) for r in sheet["rows"]):
        notes.append(labels["forfeited_note_excel" if excel else "forfeited_note"])
    return notes


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------


def build_excel(sheet: Dict[str, Any], *, lang: str = "en", teacher: Optional[str] = None) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    labels = _labels(lang)
    wb = Workbook()
    ws = wb.active
    ws.title = labels[f"tab_{sheet['kind']}"]

    def put(row: int, column: int, value: Any):
        if isinstance(value, str):
            cell = ws.cell(row=row, column=column, value=_ILLEGAL_XLSX.sub("", value))
            # Typed text is data: without this a name starting with "=" would be saved as a formula.
            cell.data_type = "s"
        else:
            cell = ws.cell(row=row, column=column, value=value)
        return cell

    ws.cell(row=1, column=1, value=_title(sheet, labels)).font = Font(bold=True, size=14)
    line = 1
    for label, value in _heading_lines(sheet, labels, lang, teacher):
        line += 1
        # One cell per line: the text runs on over the empty cells beside it, whatever their width.
        put(line, 1, f"{label}: {value}".rstrip())

    columns, rows, averages = _grid(sheet, labels, lang)
    header_row = line + 2
    fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    for index, column in enumerate(columns, start=1):
        cell = put(header_row, index, column.title)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(index)].width = column.excel_width

    line = header_row
    for cells in rows:
        line += 1
        for index, cell in enumerate(cells, start=1):
            written = put(line, index, cell.value)
            if cell.excel_format:
                written.number_format = cell.excel_format
    if rows:
        line += 1
        top = Border(top=Side(style="thin"))
        for index, cell in enumerate(averages, start=1):
            written = put(line, index, cell.value)
            written.font = Font(bold=True)
            written.border = top
    else:
        line += 1
        put(line, 1, labels["empty"])

    line += 1
    for note in _notes(sheet, labels, excel=True):
        line += 1
        put(line, 1, note).font = Font(italic=True)

    ws.freeze_panes = ws.cell(row=header_row + 1, column=5)

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


def _value_groups(count: int, room_mm: float) -> List[range]:
    """The value columns split into groups that each fit `room_mm`, as even as possible."""
    if count == 0:
        return [range(0)]
    per_group = max(1, int(room_mm // _MM_VALUE_MIN))
    groups = math.ceil(count / per_group)
    size = math.ceil(count / groups)
    return [range(start, min(start + size, count)) for start in range(0, count, size)]


def build_pdf(sheet: Dict[str, Any], *, lang: str = "en", teacher: Optional[str] = None) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except Exception as exc:  # pragma: no cover - reportlab is a declared dependency
        raise PdfUnavailable(str(exc)) from exc

    labels = _labels(lang)
    # DejaVu carries the Greek glyphs; the built-in Helvetica prints black squares instead.
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, os.path.join(FONT_DIR, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))

    all_columns, all_rows, all_averages = _grid(sheet, labels, lang)
    shown = [i for i, c in enumerate(all_columns) if c.pdf]
    columns = [all_columns[i] for i in shown]
    rows = [[cells[i] for i in shown] for cells in all_rows]
    averages = [all_averages[i] for i in shown]

    lead = [i for i, c in enumerate(columns) if c.part == "lead"]
    values = [i for i, c in enumerate(columns) if c.part == "value"]
    tail = [i for i, c in enumerate(columns) if c.part == "tail"]
    fixed_mm = sum(columns[i].width_mm for i in lead + tail)

    margin = 14 * mm
    portrait_room = (A4[0] - 2 * margin) / mm - fixed_mm
    wide = sheet["kind"] != "assessment" and len(values) * _MM_VALUE_COMFORT > portrait_room
    pagesize = landscape(A4) if wide else A4
    usable = pagesize[0] - 2 * margin
    room_mm = usable / mm - fixed_mm
    groups = _value_groups(len(values), room_mm) if values else [range(0)]

    padding = 4
    font_size = 8 if wide else 9

    def header_size(text: str, width: float) -> float:
        """The largest size at which every word of a header fits its column: a word split in two
        ("Εργαστήρι" / "ο") reads worse than a smaller one. Each header is sized on its own, so
        one long assessment name does not shrink the others."""
        size = font_size - 0.5
        while size > 5.5 and any(
            pdfmetrics.stringWidth(w, FONT_BOLD, size) > width - 2 * padding for w in text.split()
        ):
            size -= 0.5
        return size

    accent = colors.HexColor("#4F46E5")
    muted = colors.HexColor("#4B5563")
    title_style = ParagraphStyle("Title", fontName=FONT_BOLD, fontSize=15, leading=19, textColor=accent)
    meta_label = ParagraphStyle("MetaLabel", fontName=FONT_BOLD, fontSize=9, leading=12)
    meta_value = ParagraphStyle("MetaValue", fontName=FONT_REGULAR, fontSize=9, leading=12)
    cell_style = ParagraphStyle("Cell", fontName=FONT_REGULAR, fontSize=font_size, leading=font_size + 3)
    bold_cell = ParagraphStyle("Avg", parent=cell_style, fontName=FONT_BOLD)
    note_style = ParagraphStyle("Note", fontName=FONT_REGULAR, fontSize=8, leading=11, textColor=muted)

    def header_style(text: str, width: float) -> ParagraphStyle:
        size = header_size(text, width)
        return ParagraphStyle("Head", fontName=FONT_BOLD, fontSize=size, leading=size + 2.5, textColor=colors.white)

    def para(text: str, style: ParagraphStyle) -> Any:
        return Paragraph(escape(_ILLEGAL_XLSX.sub("", text)), style)

    def fitted(text: str, width: float) -> Any:
        """A student column's text, never cut inside a word: on one line when it fits; else a
        double name breaks after its hyphen ("Παπαδοπούλου-" / "Χατζηγεωργίου"), and a part that
        still does not fit takes a smaller font for that cell (not below 6.5 pt)."""
        clean = _ILLEGAL_XLSX.sub("", text)
        room = width - 2 * padding
        if pdfmetrics.stringWidth(clean, FONT_REGULAR, font_size) <= room:
            return Paragraph(escape(clean), cell_style)
        parts = [p for p in re.split(r"(?<=-)", clean) if p]
        size = float(font_size)
        while size > 6.5 and any(
            pdfmetrics.stringWidth(word, FONT_REGULAR, size) > room for part in parts for word in part.split()
        ):
            size -= 0.5
        style = ParagraphStyle("Fitted", parent=cell_style, fontSize=size, leading=size + 3)
        return Paragraph("<br/>".join(escape(part) for part in parts), style)

    story: List[Any] = [para(_title(sheet, labels), title_style), Spacer(1, 3 * mm)]
    heading = [
        [para(label, meta_label), para(value, meta_value)]
        for label, value in _heading_lines(sheet, labels, lang, teacher)
    ]
    heading_table = Table(heading, colWidths=[46 * mm, usable - 46 * mm], hAlign="LEFT")
    heading_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    story += [heading_table, Spacer(1, 4 * mm)]

    if sheet["kind"] != "assessment" and not sheet["columns"] and sheet["rows"]:
        # No assessment yet, but a course's rules can already give final grades from the daily
        # ratings: then the sheet must not say that nothing has been graded.
        story.append(para(labels["no_columns_ratings" if _bases(sheet) else "no_columns"], note_style))

    for group in groups:
        picked = lead + [values[i] for i in group] + tail
        if sheet["kind"] == "assessment":
            # The remarks column takes what the others leave.
            rest = usable - sum(columns[i].width_mm * mm for i in picked if columns[i].width_mm)
            widths = [columns[i].width_mm * mm if columns[i].width_mm else max(30 * mm, rest) for i in picked]
        else:
            each = min(_MM_VALUE_MAX, room_mm / max(1, len(group))) * mm
            widths = [columns[i].width_mm * mm if columns[i].part != "value" else each for i in picked]
        if len(groups) > 1:
            story.append(
                para(
                    labels["columns_part"].format(first=group.start + 1, last=group.stop, total=len(values)),
                    note_style,
                )
            )
        data: List[List[Any]] = [
            [para(columns[i].title, header_style(columns[i].title, w)) for i, w in zip(picked, widths)]
        ]
        for cells in rows:
            data.append(
                [
                    fitted(cells[i].text, w) if columns[i].part == "lead" else para(cells[i].text, cell_style)
                    for i, w in zip(picked, widths)
                ]
            )
        if rows:
            data.append([para(averages[i].text, bold_cell) for i in picked])
        else:
            data.append([para(labels["empty"], cell_style)] + [""] * (len(picked) - 1))

        table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), accent),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9CA3AF")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2 if rows else -1), [colors.white, colors.HexColor("#F3F4F6")]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), padding),
            ("RIGHTPADDING", (0, 0), (-1, -1), padding),
        ]
        if rows:
            style.append(("LINEABOVE", (0, -1), (-1, -1), 1, colors.black))
        else:
            style.append(("SPAN", (0, 1), (-1, 1)))
        table.setStyle(TableStyle(style))
        story += [table, Spacer(1, 4 * mm)]

    for note in _notes(sheet, labels):
        story.append(para(note, note_style))

    story.append(Spacer(1, 14 * mm))
    signature = Table(
        [
            [
                para(f"{labels['signature']}: ______________________________", meta_value),
                para(f"{labels['sign_date']}: ____/____/________", meta_value),
            ]
        ],
        colWidths=[usable * 0.6, usable * 0.4],
        hAlign="LEFT",
    )
    story.append(signature)

    title = _course_title(sheet["course"])

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT_REGULAR, 8)
        canvas.setFillColor(muted)
        canvas.drawString(doc.leftMargin, 8 * mm, title[:100])
        canvas.drawRightString(pagesize[0] - doc.rightMargin, 8 * mm, labels["page"].format(number=doc.page))
        canvas.restoreState()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title=f"{_title(sheet, labels)} - {title}",
    )
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
