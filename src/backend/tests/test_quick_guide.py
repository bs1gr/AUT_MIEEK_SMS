"""The one-page "Quick Guide" of Utils > Help & Documentation (GET /api/v1/help/user-guide/{language}).

Read against the pages on 18 November 2026, at the owner's word ("the text of the one-page PDF
behind the help"), and written anew. As it was, it promised things the application does not
have (a "Help" button, video tutorials "coming soon", support links), its Greek called the
students "φοιτητές", and it was set in a font of the operating system: the Docker image has
none, so there the Greek page came out in Helvetica, which has no Greek letters.

What the page says is checked against the application's own texts by
src/frontend/src/i18n/__tests__/quickGuide.test.ts. Here: that the page is made at all, in
both languages, on one sheet, in a font with Greek letters, and that the two texts say the
same things.
"""

import re

import pytest

from backend.routers import routers_help

URL = "/api/v1/help/user-guide/{language}"


def _pages(pdf: bytes) -> int:
    # A page object says "/Type /Page"; the list of pages says "/Type /Pages".
    return len(re.findall(rb"/Type\s*/Page(?![a-zA-Z])", pdf))


@pytest.mark.parametrize("language", ["en", "el", "EL"])
def test_the_guide_is_one_page_of_pdf(client, language):
    response = client.get(URL.format(language=language))

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert _pages(response.content) == 1
    assert f"SMS_Quick_Guide_{language.upper()}.pdf" in response.headers["content-disposition"]


@pytest.mark.parametrize("language", ["en", "el"])
def test_it_is_set_in_the_applications_own_font_which_has_greek_letters(client, language):
    pdf = client.get(URL.format(language=language)).content

    # Both faces are embedded: the text and its bold words. (The word "Helvetica" is in every
    # PDF this library makes, as the font it starts from; it is not what the page is set in.)
    assert re.search(rb"/BaseFont\s*/[A-Z]{6}\+DejaVuSans\b(?!-)", pdf)
    assert re.search(rb"/BaseFont\s*/[A-Z]{6}\+DejaVuSans-Bold\b", pdf)


def test_another_language_is_refused(client):
    assert client.get(URL.format(language="fr")).status_code == 400


def test_nobody_has_to_be_signed_in(client, monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)

    assert client.get(URL.format(language="en")).status_code == 200


def _shape(text: str) -> list[str]:
    """What kind of line each line is: title, heading, numbered step, bullet, sentence."""
    kinds = []
    for line in (raw.strip() for raw in text.strip().splitlines()):
        if not line:
            kinds.append("")
        elif line.startswith("#"):
            kinds.append(line.split(" ", 1)[0])
        elif re.match(r"\d+\. ", line):
            kinds.append("step")
        elif line.startswith("• "):
            kinds.append("bullet")
        else:
            kinds.append("sentence")
    return kinds


def test_the_two_languages_say_the_same_things():
    english, greek = routers_help.QUICK_GUIDE["en"], routers_help.QUICK_GUIDE["el"]

    assert _shape(english) == _shape(greek)
    assert _shape(english).count("step") == 5
    # As many buttons, tabs and pages are named in the one as in the other.
    assert len(re.findall(r'"[^"\n]+"', english)) == len(re.findall(r"«[^»\n]+»", greek)) > 20


def test_it_no_longer_promises_what_the_application_does_not_have():
    english, greek = routers_help.QUICK_GUIDE["en"], routers_help.QUICK_GUIDE["el"]

    for gone in ("coming soon", "Video", "support links", "'Help' button", "User Guide"):
        assert gone not in english, gone
    for gone in ("σύντομα)", "Βίντεο", "Φοιτητ", "φοιτητ", "Οδηγός Χρήστη"):
        assert gone not in greek, gone


def test_a_name_with_an_ampersand_and_a_bold_word_survive_the_markup():
    assert routers_help._markup('**Help.** "Help & Documentation" <x>') == (
        '<b>Help.</b> "Help &amp; Documentation" &lt;x&gt;'
    )
