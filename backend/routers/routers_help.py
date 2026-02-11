"""
Help and Documentation Router

Provides endpoints for accessing help documentation and user guides.
"""

from io import BytesIO
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/help")


def _register_unicode_fonts():
    """Register Unicode-capable fonts for Greek and other languages"""
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        # Find system font that supports Greek (Arial, DejaVu, or Noto Sans)
        font_candidates = [
            # Windows paths
            "C:\\Windows\\Fonts\\arial.ttf",
            "C:\\Windows\\Fonts\\ariblk.ttf",
            "C:\\Windows\\Fonts\\DejaVuSans.ttf",
            "C:\\Windows\\Fonts\\NotoSans-Regular.ttf",
            # Linux paths
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            # macOS paths
            "/Library/Fonts/Arial.ttf",
            "/Library/Fonts/DejaVuSans.ttf",
        ]

        font_file = None
        for candidate in font_candidates:
            if Path(candidate).exists():
                font_file = candidate
                break

        if font_file:
            # Register the font under different names for flexibility
            try:
                pdfmetrics.registerFont(TTFont("CustomFont", font_file))
                pdfmetrics.registerFont(TTFont("CustomFontBold", font_file))
                return "CustomFont", "CustomFontBold"
            except Exception as e:
                print(f"Could not register font {font_file}: {e}")

        # Fallback to built-in Helvetica (limited Greek support)
        return "Helvetica", "Helvetica-Bold"
    except Exception as e:
        print(f"Font registration error: {e}")
        return "Helvetica", "Helvetica-Bold"


@router.get("/user-guide/{language}")
async def get_user_guide(language: str = "en"):
    """
    Serve user guide PDF in specified language.

    Args:
        language: 'en' for English, 'el' for Greek (Ελληνικά)

    Returns:
        PDF file for download
    """
    if language.lower() not in ["en", "el"]:
        raise HTTPException(status_code=400, detail="Language must be 'en' or 'el'")

    # Generate PDF content
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

        # Register unicode-capable fonts
        font_normal, font_bold = _register_unicode_fonts()

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch,
        )

        styles = getSampleStyleSheet()

        # Update default styles with Unicode-capable font
        for style in styles.byName.values():
            style.fontName = font_normal

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=font_normal,
            fontSize=24,
            textColor='#4f46e5',
            spaceAfter=30,
            alignment=1,  # Center alignment
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=font_normal,
            fontSize=14,
            textColor='#4f46e5',
            spaceAfter=12,
            spaceBefore=12,
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontName=font_normal,
            fontSize=11,
            leading=14,
        )

        story = []

        # Title
        if language.lower() == "en":
            story.append(Paragraph("Student Management System", title_style))
            story.append(Paragraph("User Guide", heading_style))
            story.append(Spacer(1, 20))

            # Quick Start
            story.append(Paragraph("Quick Start (3 Steps)", heading_style))
            story.append(Paragraph(
                "1. <b>Create Students:</b> Add student names, IDs, and email addresses<br/>"
                "2. <b>Add Courses:</b> Set up courses and grading rules<br/>"
                "3. <b>Record Data:</b> Track attendance, grades, and performance",
                body_style
            ))
            story.append(Spacer(1, 12))

            # Features
            story.append(Paragraph("Key Features", heading_style))
            story.append(Paragraph(
                "✓ Student &amp; Course Management<br/>"
                "✓ Attendance Tracking<br/>"
                "✓ Grades &amp; Performance Analysis<br/>"
                "✓ Custom Reports &amp; Exports<br/>"
                "✓ Multi-Language Support (EN/EL)<br/>"
                "✓ Auto-Save &amp; Data Backup<br/>"
                "✓ Real-Time Analytics Dashboard",
                body_style
            ))
            story.append(Spacer(1, 12))

            # Help System
            story.append(Paragraph("Getting Help", heading_style))
            story.append(Paragraph(
                "Need more information? Access the built-in help system by clicking the "
                "'Help' button in the application. You'll find:<br/>"
                "• Detailed feature explanations<br/>"
                "• Step-by-step how-to guides<br/>"
                "• Video tutorials (coming soon)<br/>"
                "• Direct support links",
                body_style
            ))

        else:  # Greek
            story.append(Paragraph("Σύστημα Διαχείρισης Φοιτητών", title_style))
            story.append(Paragraph("Οδηγός Χρήστη", heading_style))
            story.append(Spacer(1, 20))

            # Quick Start
            story.append(Paragraph("Γρήγορη Έναρξη (3 Βήματα)", heading_style))
            story.append(Paragraph(
                "1. <b>Δημιουργία Φοιτητών:</b> Προσθέστε ονόματα, ΑΜ και email φοιτητών<br/>"
                "2. <b>Προσθήκη Μαθημάτων:</b> Ορίστε μαθήματα και κανόνες αξιολόγησης<br/>"
                "3. <b>Καταγραφή Δεδομένων:</b> Παρακολουθήστε παρουσία, βαθμούς και απόδοση",
                body_style
            ))
            story.append(Spacer(1, 12))

            # Features
            story.append(Paragraph("Κύρια Χαρακτηριστικά", heading_style))
            story.append(Paragraph(
                "✓ Διαχείριση Φοιτητών &amp; Μαθημάτων<br/>"
                "✓ Παρακολούθηση Παρουσίας<br/>"
                "✓ Ανάλυση Βαθμών &amp; Απόδοσης<br/>"
                "✓ Προσαρμοσμένες Αναφορές &amp; Εξαγωγές<br/>"
                "✓ Πολύγλωσση Υποστήριξη (EN/EL)<br/>"
                "✓ Αυτόματη Αποθήκευση &amp; Αντίγραφο Ασφαλείας<br/>"
                "✓ Άμεσος Πίνακας Ελέγχου Ανάλυσης",
                body_style
            ))
            story.append(Spacer(1, 12))

            # Help System
            story.append(Paragraph("Λήψη Βοήθειας", heading_style))
            story.append(Paragraph(
                "Χρειάζεστε περισσότερες πληροφορίες; Προσπελάστε το ενσωματωμένο σύστημα "
                "βοήθειας κάνοντας κλικ στο κουμπί 'Βοήθεια' στην εφαρμογή. Θα βρείτε:<br/>"
                "• Λεπτομερείς εξηγήσεις χαρακτηριστικών<br/>"
                "• Βήμα προς βήμα οδηγούς<br/>"
                "• Βίντεο εκπαίδευσης (σύντομα)<br/>"
                "• Άμεσα links υποστήριξης",
                body_style
            ))

        # Build PDF
        doc.build(story)
        pdf_buffer.seek(0)

        # Return PDF file using StreamingResponse
        filename = f"SMS_User_Guide_{'EN' if language.lower() == 'en' else 'EL'}.pdf"
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation library not available. Please install reportlab."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
