"""The lesson log of one course as a printable PDF and as an Excel sheet.

Both list what was taught, by date and teaching period, in teaching order, so the file can stand
as the course's record of material covered. The teacher's notes are private and are left out
unless the caller asks for them.

The PDF is built from paragraphs, not from a table: an entry can be several thousand characters,
and a table row cannot break across pages, while a paragraph can.
"""

from __future__ import annotations

import os
import re
from datetime import date, datetime
from io import BytesIO
from typing import Any, Iterable, Optional
from xml.sax.saxutils import escape

FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")
FONT_REGULAR = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"

PDF_MEDIA_TYPE = "application/pdf"
EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

LABELS = {
    "en": {
        "title": "Lesson log",
        "course": "Course",
        "semester": "Semester",
        "range": "Dates",
        "range_all": "All entries",
        "range_from": "from {start}",
        "range_until": "until {end}",
        "range_between": "{start} to {end}",
        "generated": "Generated on",
        "entries": "Entries",
        "date": "Date",
        "period": "Period",
        "period_n": "Period {number}",
        "material": "Material covered",
        "notes": "Teacher's notes",
        "editor": "Last edited by",
        "edited_at": "Last change",
        "nothing": "Nothing recorded",
        "empty": "No lesson log entries for this course in the selected dates.",
        "notes_included": "This copy includes the teacher's private notes.",
        "page": "Page {number}",
    },
    "el": {
        "title": "Καταγραφή μαθήματος",
        "course": "Μάθημα",
        "semester": "Εξάμηνο",
        "range": "Ημερομηνίες",
        "range_all": "Όλες οι καταγραφές",
        "range_from": "από {start}",
        "range_until": "έως {end}",
        "range_between": "{start} έως {end}",
        "generated": "Ημερομηνία έκδοσης",
        "entries": "Καταγραφές",
        "date": "Ημερομηνία",
        "period": "Περίοδος",
        "period_n": "Περίοδος {number}",
        "material": "Διδακτέα ύλη",
        "notes": "Σημειώσεις καθηγητή",
        "editor": "Τελευταία επεξεργασία από",
        "edited_at": "Τελευταία αλλαγή",
        "nothing": "Δεν έχει καταγραφεί τίποτα",
        "empty": "Δεν υπάρχουν καταγραφές μαθήματος για αυτό το μάθημα στις επιλεγμένες ημερομηνίες.",
        "notes_included": "Το αντίγραφο αυτό περιλαμβάνει τις προσωπικές σημειώσεις του καθηγητή.",
        "page": "Σελίδα {number}",
    },
}

# Characters an .xlsx cell cannot hold (same set openpyxl rejects with IllegalCharacterError).
_ILLEGAL_XLSX = re.compile(r"[\000-\010]|[\013-\014]|[\016-\037]")


class PdfUnavailable(RuntimeError):
    """reportlab is not installed in this build."""


def resolve_lang(query_lang: Optional[str], accept_language: Optional[str]) -> str:
    """'el' or 'en': the explicit ?lang= wins, then the browser's Accept-Language."""
    if query_lang and query_lang.lower()[:2] in LABELS:
        return query_lang.lower()[:2]
    return "el" if "el" in (accept_language or "").lower() else "en"


def _labels(lang: str) -> dict[str, str]:
    return LABELS.get(lang, LABELS["en"])


def _day(value: Optional[date]) -> str:
    return value.strftime("%d/%m/%Y") if value else ""


def _range_text(labels: dict[str, str], start: Optional[date], end: Optional[date]) -> str:
    if start and end:
        return labels["range_between"].format(start=_day(start), end=_day(end))
    if start:
        return labels["range_from"].format(start=_day(start))
    if end:
        return labels["range_until"].format(end=_day(end))
    return labels["range_all"]


def _course_title(course: Any) -> str:
    code = (getattr(course, "course_code", None) or "").strip()
    name = (getattr(course, "course_name", None) or "").strip()
    return " - ".join(part for part in (code, name) if part)


def printable_rows(rows: Iterable[Any], include_notes: bool) -> list[Any]:
    """Entries that have something to print: material, or notes when the notes are included.

    A period whose only content is a private note must not show up in a copy without notes, not
    even as an empty line, because that alone would say a note exists.
    """
    kept = []
    for row in rows:
        if row.material_covered or (include_notes and row.teacher_notes):
            kept.append(row)
    return kept


def export_filename(course: Any, extension: str, today: Optional[date] = None) -> str:
    """ASCII-only file name (HTTP headers are latin-1): lesson_log_<course code>_<date>.<ext>."""
    code = re.sub(r"[^A-Za-z0-9]+", "_", getattr(course, "course_code", None) or "").strip("_")
    stamp = (today or date.today()).strftime("%Y%m%d")
    return f"lesson_log_{code or 'course'}_{stamp}.{extension}"


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------


def _xlsx_text(value: Optional[str]) -> str:
    return _ILLEGAL_XLSX.sub("", value or "")


def build_excel(
    course: Any,
    rows: Iterable[Any],
    *,
    lang: str = "en",
    include_notes: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    labels = _labels(lang)
    entries = printable_rows(rows, include_notes)

    wb = Workbook()
    ws = wb.active
    ws.title = labels["title"][:31]

    def put_text(row: int, column: int, value: Optional[str]):
        cell = ws.cell(row=row, column=column, value=_xlsx_text(value))
        # Typed text is data: without this a line starting with "=" would be saved as a formula.
        cell.data_type = "s"
        return cell

    ws.cell(row=1, column=1, value=labels["title"]).font = Font(bold=True, size=14)
    summary = [
        (labels["course"], _course_title(course)),
        (labels["semester"], getattr(course, "semester", None) or ""),
        (labels["range"], _range_text(labels, start_date, end_date)),
        (labels["generated"], _day(date.today())),
    ]
    for offset, (label, value) in enumerate(summary, start=2):
        ws.cell(row=offset, column=1, value=label).font = Font(bold=True)
        put_text(offset, 2, value)
    next_row = len(summary) + 2
    if include_notes:
        ws.cell(row=next_row, column=1, value=labels["notes_included"]).font = Font(italic=True)
        next_row += 1

    headers = [labels["date"], labels["period"], labels["material"]]
    if include_notes:
        headers.append(labels["notes"])
    headers += [labels["editor"], labels["edited_at"]]

    header_row = next_row + 1
    fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    for column, header in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=column, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    wrap_top = Alignment(vertical="top", wrap_text=True)
    top = Alignment(vertical="top")
    line = header_row
    for entry in entries:
        line += 1
        day_cell = ws.cell(row=line, column=1, value=entry.date)
        day_cell.number_format = "DD/MM/YYYY"
        day_cell.alignment = top
        ws.cell(row=line, column=2, value=entry.period_number).alignment = top
        column = 3
        put_text(line, column, entry.material_covered).alignment = wrap_top
        if include_notes:
            column += 1
            put_text(line, column, entry.teacher_notes).alignment = wrap_top
        put_text(line, column + 1, getattr(entry, "updated_by_name", None)).alignment = top
        changed = getattr(entry, "updated_at", None)
        put_text(line, column + 2, changed.strftime("%d/%m/%Y %H:%M") if isinstance(changed, datetime) else "").alignment = top

    if not entries:
        put_text(header_row + 1, 1, labels["empty"])

    widths = [14, 10, 70] + ([50] if include_notes else []) + [28, 18]
    for index, width in enumerate(widths):
        ws.column_dimensions[chr(ord("A") + index)].width = width
    ws.freeze_panes = ws.cell(row=header_row + 1, column=1)

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


def _pdf_text(value: Optional[str]) -> str:
    """Typed text as reportlab paragraph markup: escaped, with the line breaks kept."""
    cleaned = _ILLEGAL_XLSX.sub("", value or "").replace("\r\n", "\n").replace("\r", "\n")
    return escape(cleaned).replace("\n", "<br/>")


def build_pdf(
    course: Any,
    rows: Iterable[Any],
    *,
    lang: str = "en",
    include_notes: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer
    except Exception as exc:  # pragma: no cover - reportlab is a declared dependency
        raise PdfUnavailable(str(exc)) from exc

    labels = _labels(lang)
    entries = printable_rows(rows, include_notes)

    # DejaVu carries the Greek glyphs; the built-in Helvetica prints black squares instead.
    pdfmetrics.registerFont(TTFont(FONT_REGULAR, os.path.join(FONT_DIR, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))

    accent = colors.HexColor("#4F46E5")
    muted = colors.HexColor("#4B5563")
    title_style = ParagraphStyle("Title", fontName=FONT_BOLD, fontSize=16, leading=20, textColor=accent)
    course_style = ParagraphStyle("Course", fontName=FONT_BOLD, fontSize=12, leading=16, spaceBefore=4)
    meta_style = ParagraphStyle("Meta", fontName=FONT_REGULAR, fontSize=9, leading=13, textColor=muted)
    entry_style = ParagraphStyle(
        "Entry", fontName=FONT_BOLD, fontSize=10.5, leading=14, spaceBefore=8, spaceAfter=2, keepWithNext=1
    )
    label_style = ParagraphStyle(
        "Label", fontName=FONT_BOLD, fontSize=8.5, leading=12, textColor=muted, spaceBefore=3, keepWithNext=1
    )
    body_style = ParagraphStyle("Body", fontName=FONT_REGULAR, fontSize=10, leading=14)
    editor_style = ParagraphStyle("Editor", fontName=FONT_REGULAR, fontSize=8, leading=11, textColor=muted, spaceBefore=3)

    story: list[Any] = [
        Paragraph(escape(labels["title"]), title_style),
        Paragraph(_pdf_text(_course_title(course)), course_style),
    ]
    meta = []
    semester = getattr(course, "semester", None)
    if semester:
        meta.append(f"{labels['semester']}: {semester}")
    meta.append(f"{labels['range']}: {_range_text(labels, start_date, end_date)}")
    meta.append(f"{labels['entries']}: {len(entries)}")
    meta.append(f"{labels['generated']}: {_day(date.today())}")
    story.append(Paragraph(_pdf_text("  |  ".join(meta)), meta_style))
    if include_notes:
        story.append(Paragraph(escape(labels["notes_included"]), meta_style))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=accent))

    if not entries:
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(escape(labels["empty"]), body_style))

    for entry in entries:
        heading = f"{_day(entry.date)}  -  {labels['period_n'].format(number=entry.period_number)}"
        story.append(Paragraph(escape(heading), entry_style))
        if include_notes:
            story.append(Paragraph(escape(labels["material"]), label_style))
        story.append(Paragraph(_pdf_text(entry.material_covered) or escape(labels["nothing"]), body_style))
        if include_notes and entry.teacher_notes:
            story.append(Paragraph(escape(labels["notes"]), label_style))
            story.append(Paragraph(_pdf_text(entry.teacher_notes), body_style))
        editor = getattr(entry, "updated_by_name", None)
        if editor:
            story.append(Paragraph(_pdf_text(f"{labels['editor']}: {editor}"), editor_style))
        story.append(Spacer(1, 2 * mm))
        story.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor("#D1D5DB")))

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT_REGULAR, 8)
        canvas.setFillColor(muted)
        canvas.drawString(doc.leftMargin, 10 * mm, _course_title(course)[:90])
        canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, labels["page"].format(number=doc.page))
        canvas.restoreState()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=f"{labels['title']} - {_course_title(course)}",
    )
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
