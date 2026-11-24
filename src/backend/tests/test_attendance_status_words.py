"""Every file names the attendance statuses in the Attendance page's words (plan todo 78, point 3).

The Attendance page says «Παρών», «Απών», «Αργοπορία», «Δικαιολογημένος». Until November 2026
the Export Center's files said «Παρόν», «Καθυστέρηση», «Δικαιολογημένη» (in their headers and
in every status cell) and the custom reports «Καθυστέρηση» for a Late. The words are read from
the page's own translation file, so a change there shows up here.
"""

import re
from pathlib import Path

import pytest

STATUSES = ("present", "absent", "late", "excused")
PAGE_LOCALE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "locales" / "el" / "attendance.js"


def _page_words() -> dict[str, str]:
    text = PAGE_LOCALE.read_text(encoding="utf-8")
    words = {}
    for key in STATUSES:
        # The first top-level `key: '...'` of the module: the page's status names.
        match = re.search(rf"^\s{{2}}{key}:\s*'([^']+)'", text, flags=re.MULTILINE)
        assert match, f"{key} not found in {PAGE_LOCALE.name}"
        words[key] = match.group(1)
    return words


def test_the_page_words_are_the_ones_the_owner_sees():
    assert _page_words() == {
        "present": "Παρών",
        "absent": "Απών",
        "late": "Αργοπορία",
        "excused": "Δικαιολογημένος",
    }


@pytest.mark.parametrize("status", STATUSES)
def test_the_export_center_uses_the_page_words(status):
    from backend.routers.routers_exports import t, translate_status_value

    word = _page_words()[status]
    assert t(status, "el") == word  # the column headers
    assert translate_status_value(status.title(), "el") == word  # every status cell


@pytest.mark.parametrize("status", STATUSES)
def test_the_custom_reports_use_the_page_words(status):
    from backend.services.custom_report_generation_service import CustomReportGenerationService

    assert CustomReportGenerationService.VALUE_TRANSLATIONS[status]["el"] == _page_words()[status]


def test_a_tardy_in_a_custom_report_is_a_late():
    from backend.services.custom_report_generation_service import CustomReportGenerationService

    assert CustomReportGenerationService.VALUE_TRANSLATIONS["tardy"]["el"] == _page_words()["late"]
