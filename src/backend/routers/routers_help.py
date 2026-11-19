"""
Help and Documentation Router

Serves the one-page "Quick Guide" of Utils > Help & Documentation as a PDF, in English and in
Greek. The page is composed here, from the two texts below.
"""

import html
import re
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/help")

# What the Quick Guide says. Written as plain text so that it can be read against the pages:
# "# " is the title, "## " the line under it, "### " a heading, "**...**" bold; an empty line
# ends a paragraph. Every button, tab or page it names stands in quotation marks ("..." in
# English, «...» in Greek) under the name the application gives it in that language, and
# src/frontend/src/i18n/__tests__/quickGuide.test.ts fails when one of them is no longer a
# text of the application: rename a button and the test says that this page has to follow.
#
# Until November 2026 the page promised a "Help" button, video tutorials and support links,
# none of which exist, and its Greek called the students "φοιτητές".
QUICK_GUIDE_EN = """
# Student Management System
## Quick Guide

### To get started
1. **Students.** Open "Students" and click "Add Student": the student's ID, first name, last name and e-mail address.
2. **Courses.** Open "Courses" and click "Add Course". Then give the course its "Evaluation Rules" (categories whose weights add up to 100%) and its "Teaching Schedule".
3. **Enrolment.** On the tab "Enrollment" of the course, enrol its students. A course becomes active when it has students.
4. **Attendance.** Open "Attendance", choose the course and the day, and mark each student. What you enter is saved by itself.
5. **Grades.** Open "Grades", choose a student and a course, and add each grade with "Save Grade". The page shows the final grade so far.

### The pages
• "Dashboard": the figures, the students who need attention, and "Analytics"
• "Search": students, courses and grades
• "Calendar": the week's teaching schedule
• "Utils": "Export", "Imports", "Settings", "Reports", "Notifications" and the help
• "System": the state of the application and the Control Panel

The language switch is at the top right, next to the bell with your notifications.

### Your account
An administrator creates your account, or approves the one you asked for with "Request access" on the sign-in page. To change your password: "System" → "Show Control Panel" → "Maintenance" → "User Accounts".

### More help
"Utils" → "Help & Documentation" answers the common questions, and has a search box. "Send Feedback", at the bottom of every page, sends a remark to the "Feedback Inbox" of the administrators and teachers.
"""

QUICK_GUIDE_EL = """
# Σύστημα Διαχείρισης Σπουδαστών
## Σύντομος Οδηγός

### Για να ξεκινήσετε
1. **Σπουδαστές.** Ανοίξτε τους «Σπουδαστές» και πατήστε «Προσθήκη Σπουδαστή»: αριθμός μητρώου, όνομα, επώνυμο και διεύθυνση email.
2. **Μαθήματα.** Ανοίξτε τα «Μαθήματα» και πατήστε «Προσθήκη Μαθήματος». Έπειτα δώστε στο μάθημα τους «Κανόνες Αξιολόγησης» (κατηγορίες με βαρύτητες που αθροίζουν στο 100%) και το «Πρόγραμμα Διδασκαλίας».
3. **Εγγραφή.** Στην καρτέλα «Εγγραφές» του μαθήματος, εγγράψτε τους σπουδαστές του. Ένα μάθημα γίνεται ενεργό όταν έχει σπουδαστές.
4. **Παρουσίες.** Ανοίξτε τις «Παρουσίες», επιλέξτε το μάθημα και την ημέρα, και σημειώστε κάθε σπουδαστή. Ό,τι καταχωρίζετε αποθηκεύεται μόνο του.
5. **Βαθμοί.** Ανοίξτε τη σελίδα «Βαθμοί», επιλέξτε σπουδαστή και μάθημα, και προσθέστε κάθε βαθμό με «Αποθήκευση Βαθμού». Η σελίδα δείχνει τον τελικό βαθμό ως τώρα.

### Οι σελίδες
• «Επισκόπηση»: τα στοιχεία, οι σπουδαστές που χρειάζονται προσοχή και τα «Αναλυτικά»
• «Αναζήτηση»: σπουδαστές, μαθήματα και βαθμοί
• «Ημερολόγιο»: το πρόγραμμα διδασκαλίας της εβδομάδας
• «Εργαλεία»: «Εξαγωγή», «Εισαγωγές», «Ρυθμίσεις», «Αναφορές», «Ειδοποιήσεις» και η βοήθεια
• «Σύστημα»: η κατάσταση της εφαρμογής και ο Πίνακας Ελέγχου

Η αλλαγή γλώσσας βρίσκεται πάνω δεξιά, δίπλα στο καμπανάκι με τις ειδοποιήσεις σας.

### Ο λογαριασμός σας
Ένας διαχειριστής δημιουργεί τον λογαριασμό σας, ή εγκρίνει αυτόν που ζητήσατε με «Εμφάνιση φόρμας εγγραφής» στη σελίδα σύνδεσης. Για να αλλάξετε τον κωδικό σας: «Σύστημα» → «Προβολή Πίνακα Ελέγχου» → «Συντήρηση» → «Λογαριασμοί Χρηστών».

### Περισσότερη βοήθεια
«Εργαλεία» → «Βοήθεια & Τεκμηρίωση»: απαντήσεις στις συνηθισμένες ερωτήσεις, με πεδίο αναζήτησης. Η «Αποστολή σχολίων», στο κάτω μέρος κάθε σελίδας, στέλνει ένα σχόλιο στο «Κιβώτιο Ανατροφοδότησης» των διαχειριστών και των εκπαιδευτών.
"""

QUICK_GUIDE = {"en": QUICK_GUIDE_EN, "el": QUICK_GUIDE_EL}


def _register_unicode_fonts() -> tuple[str, str]:
    """The fonts for the page: one that has Greek letters, and its bold.

    The DejaVu fonts the application carries (backend/fonts, also inside SMS Lite) come
    first. This used to look for fonts of the operating system alone; the Docker image has
    none, so there the Greek page was set in Helvetica, which has no Greek letters.
    """
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        registered = set(pdfmetrics.getRegisteredFontNames())

        fonts_dir = Path(__file__).resolve().parents[1] / "fonts"
        regular, bold = fonts_dir / "DejaVuSans.ttf", fonts_dir / "DejaVuSans-Bold.ttf"
        if regular.exists() and bold.exists():
            try:
                if "DejaVuSans" not in registered:
                    pdfmetrics.registerFont(TTFont("DejaVuSans", str(regular)))
                if "DejaVuSans-Bold" not in registered:
                    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(bold)))
                pdfmetrics.registerFontFamily(
                    "DejaVuSans",
                    normal="DejaVuSans",
                    bold="DejaVuSans-Bold",
                    italic="DejaVuSans",
                    boldItalic="DejaVuSans-Bold",
                )
                return "DejaVuSans", "DejaVuSans-Bold"
            except Exception as e:
                print(f"Could not register the DejaVu fonts of the application: {e}")

        # A font of the operating system that has Greek letters (no bold of its own).
        font_candidates = [
            "C:\\Windows\\Fonts\\arial.ttf",
            "C:\\Windows\\Fonts\\DejaVuSans.ttf",
            "C:\\Windows\\Fonts\\NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/Library/Fonts/Arial.ttf",
            "/Library/Fonts/DejaVuSans.ttf",
        ]
        for candidate in font_candidates:
            if not Path(candidate).exists():
                continue
            try:
                if "CustomFont" not in registered:
                    pdfmetrics.registerFont(TTFont("CustomFont", candidate))
                pdfmetrics.registerFontFamily(
                    "CustomFont", normal="CustomFont", bold="CustomFont", italic="CustomFont", boldItalic="CustomFont"
                )
                return "CustomFont", "CustomFont"
            except Exception as e:
                print(f"Could not register font {candidate}: {e}")

        # Built-in Helvetica: no Greek letters.
        return "Helvetica", "Helvetica-Bold"
    except Exception as e:
        print(f"Font registration error: {e}")
        return "Helvetica", "Helvetica-Bold"


def _markup(line: str) -> str:
    """One line of the guide's text as the markup the PDF paragraphs take."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(line, quote=False))


@router.get("/user-guide/{language}")
def get_user_guide(language: str = "en"):
    """
    The Quick Guide as a PDF, in the language asked for.

    Args:
        language: 'en' for English, 'el' for Greek (Ελληνικά)

    Returns:
        PDF file for download
    """
    language = language.lower()
    if language not in QUICK_GUIDE:
        raise HTTPException(status_code=400, detail="Language must be 'en' or 'el'")

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer

        font_normal, font_bold = _register_unicode_fonts()

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.6 * inch,
            bottomMargin=0.6 * inch,
            title="Quick Guide" if language == "en" else "Σύντομος Οδηγός",
        )

        styles = getSampleStyleSheet()
        indigo = colors.HexColor("#4f46e5")
        title_style = ParagraphStyle(
            "GuideTitle",
            parent=styles["Heading1"],
            fontName=font_bold,
            fontSize=20,
            textColor=indigo,
            spaceAfter=4,
            alignment=1,  # centred
        )
        subtitle_style = ParagraphStyle(
            "GuideSubtitle",
            parent=styles["Heading2"],
            fontName=font_normal,
            fontSize=13,
            textColor=indigo,
            spaceAfter=10,
            alignment=1,
        )
        heading_style = ParagraphStyle(
            "GuideHeading",
            parent=styles["Heading2"],
            fontName=font_bold,
            fontSize=12,
            textColor=indigo,
            spaceBefore=8,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "GuideBody",
            parent=styles["Normal"],
            fontName=font_normal,
            fontSize=10,
            leading=14,
            spaceAfter=6,
        )

        story: list[Flowable] = []
        paragraph: list[str] = []

        def end_paragraph() -> None:
            if paragraph:
                story.append(Paragraph("<br/>".join(paragraph), body_style))
                paragraph.clear()

        for raw in QUICK_GUIDE[language].strip().splitlines():
            line = raw.strip()
            if not line:
                end_paragraph()
            elif line.startswith("### "):
                end_paragraph()
                story.append(Paragraph(_markup(line[4:]), heading_style))
            elif line.startswith("## "):
                end_paragraph()
                story.append(Paragraph(_markup(line[3:]), subtitle_style))
            elif line.startswith("# "):
                end_paragraph()
                story.append(Paragraph(_markup(line[2:]), title_style))
            else:
                paragraph.append(_markup(line))
        end_paragraph()
        story.append(Spacer(1, 4))

        doc.build(story)
        pdf_buffer.seek(0)

        filename = f"SMS_Quick_Guide_{language.upper()}.pdf"
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation library not available. Please install reportlab.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
