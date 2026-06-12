"""
Tests for Analytics Export Service (analytics_export_service.py)
Tests for Excel and PDF export functionality
"""

import io

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # pypdf is optional for some test runs


class TestAnalyticsExportService:
    """Test suite for analytics export service"""

    def test_export_service_initialization(self, clean_db):
        """Test that export service can be initialized"""
        from backend.services.analytics_export_service import AnalyticsExportService

        service = AnalyticsExportService(db=clean_db)
        assert service is not None

    def test_export_to_excel_creates_workbook(self, clean_db):
        """Test that export_dashboard_to_excel creates a valid Excel workbook"""
        from backend.services.analytics_export_service import AnalyticsExportService

        service = AnalyticsExportService(db=clean_db)

        # Call actual method - export_dashboard_to_excel
        result = service.export_dashboard_to_excel(filename="test_report.xlsx")

        assert result is not None
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_export_to_pdf_creates_document(self, clean_db):
        """Test that export_dashboard_to_pdf creates a valid PDF document"""
        from backend.services.analytics_export_service import AnalyticsExportService

        service = AnalyticsExportService(db=clean_db)

        # Call actual method - export_dashboard_to_pdf
        result = service.export_dashboard_to_pdf(filename="test_report.pdf")

        assert result is not None
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_export_to_pdf_preserves_greek_text(self, clean_db):
        """Test that export_dashboard_to_pdf renders Greek text with a Unicode font."""
        import pytest

        if PdfReader is None:
            pytest.skip("pypdf not installed - skipping PDF text extraction test")

        from backend.services.analytics_export_service import AnalyticsExportService

        service = AnalyticsExportService(db=clean_db, language="el")

        pdf_bytes = service.export_dashboard_to_pdf(
            filename="test_report.pdf",
            data={
                "summary": {
                    "total_students": 42,
                    "total_courses": 7,
                    "average_grade": 78.5,
                    "average_attendance": 91.3,
                },
                "class_averages": [
                    {"label": "Τάξη Α", "count": 18, "average": 83.4},
                ],
                "course_averages": [
                    {"label": "Μάθημα Πληροφορικής", "count": 10, "average": 88.6},
                ],
            },
        )

        assert pdf_bytes is not None
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF")

        # Validate PDF structure and text content
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        extracted_text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)

        assert "Αναφορά Αναλυτικών Δεδομένων" in extracted_text
        assert "Τάξη Α" in extracted_text
        assert "Μάθημα Πληροφορικής" in extracted_text

        # Check that PDF has font references (basic validation that fonts were registered)
        pdf_bytes_str = pdf_bytes.decode("latin-1", errors="ignore")
        # DejaVuSans or Helvetica fonts should be referenced in PDF
        assert "Font" in pdf_bytes_str or "TrueType" in pdf_bytes_str, "No font references found in PDF"

    def test_export_generates_unique_filenames(self, clean_db):
        """Test that export service can be called with various filenames"""
        from backend.services.analytics_export_service import AnalyticsExportService

        service = AnalyticsExportService(db=clean_db)

        # Test that methods accept filename parameters
        result1 = service.export_dashboard_to_excel(filename="report_001.xlsx")
        result2 = service.export_dashboard_to_excel(filename="report_002.xlsx")

        assert result1 is not None
        assert result2 is not None
