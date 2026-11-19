#!/usr/bin/env python3
"""
Generate the installer's two information pages, in English and in Greek, for Inno Setup.

The wizard shows one page before the files are copied (InfoBeforeFile) and one after
(InfoAfterFile), and it shows the same two whichever edition was chosen on the page
"Installation Type". So each page says what holds for the Docker edition and what holds for
SMS Lite.

This script is part of the installer build (INSTALLER_BUILDER.ps1, RELEASE_READY.ps1): the
pages are written anew from the lines below at every build, with the version of the VERSION
file. Change the lines here, not the .rtf files.

Until November 2026 only the Greek pages were made here. The English ones were files written
by hand: they said "v1.18.30" through 44 releases, and both languages told somebody installing
SMS Lite that Docker Desktop was required and that a container would now be built. What the
pages say is kept to what the wizard does by src/backend/tests/test_installer_info_pages.py.

Greek letters go into the files as CP1253 RTF escapes, which Inno Setup shows reliably.
(The file keeps its name because the build scripts call it by that name.)

Outputs, in infra/installer/windows:
    installer_welcome.rtf      installer_complete.rtf        (English)
    installer_welcome_el.rtf   installer_complete_el.rtf     (Greek)
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).parent
# Project root is 3 levels up from infra/scripts/diagnostics/
PROJECT_ROOT = ROOT.parent.parent.parent
INSTALLER_DIR = PROJECT_ROOT / "infra" / "installer" / "windows"
VERSION_FILE = PROJECT_ROOT / "VERSION"


def read_version() -> str:
    try:
        return VERSION_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "v1.14.0"


VERSION = read_version()

# A line is (text, kind). Kinds: "title" (the page's heading), "bold" (a heading inside the
# page), "bullet", "text", and "" for an empty line. The two languages of a page have the same
# kinds in the same order: the test compares them.
TITLE, BOLD, BULLET, TEXT, EMPTY = "title", "bold", "bullet", "text", ""

# ---------------------------------------------------------------------------------------------
# Before the files are copied
# ---------------------------------------------------------------------------------------------

WELCOME_EN = [
    ("Before the files are copied", TITLE),
    ("", EMPTY),
    (f"Student Management System {VERSION}", BOLD),
    ("", EMPTY),
    (
        (
            "This page is the same for both editions. Read the part about the edition you chose on the "
            'page "Installation Type".'
        ),
        TEXT,
    ),
    ("", EMPTY),
    ("Docker Production Edition", BOLD),
    ("Windows 10 or 11 (64-bit)", BULLET),
    ("Docker Desktop, installed and running", BULLET),
    ("4 GB RAM minimum (8 GB recommended)", BULLET),
    ("2 GB free disk space", BULLET),
    (
        (
            "After the files are copied, the wizard builds the application's Docker image. "
            "The first time this takes 5-10 minutes."
        ),
        BULLET,
    ),
    ("", EMPTY),
    ("Native Lite Edition", BOLD),
    ("Windows 10 or 11 (64-bit)", BULLET),
    ("Docker is not needed, and nothing is built", BULLET),
    ("", EMPTY),
    ("What is installed", BOLD),
    ("The application's files, normally in C:\\Program Files\\SMS", BULLET),
    ("Start Menu entries, and a desktop shortcut if that box is ticked", BULLET),
    ("", EMPTY),
    ("Click Next to continue.", TEXT),
]

WELCOME_EL = [
    ("Πριν αντιγραφούν τα αρχεία", TITLE),
    ("", EMPTY),
    (f"Student Management System {VERSION}", BOLD),
    ("", EMPTY),
    (
        (
            "Η σελίδα αυτή είναι ίδια και για τις δύο εκδόσεις. Διαβάστε το μέρος για την έκδοση που "
            "επιλέξατε στη σελίδα «Τύπος Εγκατάστασης»."
        ),
        TEXT,
    ),
    ("", EMPTY),
    ("Έκδοση Docker Production", BOLD),
    ("Windows 10 ή 11 (64-bit)", BULLET),
    ("Docker Desktop, εγκατεστημένο και σε λειτουργία", BULLET),
    ("4 GB RAM ελάχιστο (συνιστώνται 8 GB)", BULLET),
    ("2 GB ελεύθερος χώρος στον δίσκο", BULLET),
    (
        (
            "Αφού αντιγραφούν τα αρχεία, ο οδηγός χτίζει το Docker image της εφαρμογής. "
            "Την πρώτη φορά αυτό διαρκεί 5-10 λεπτά."
        ),
        BULLET,
    ),
    ("", EMPTY),
    ("Lite Edition", BOLD),
    ("Windows 10 ή 11 (64-bit)", BULLET),
    ("Δεν χρειάζεται Docker και δεν χτίζεται τίποτα", BULLET),
    ("", EMPTY),
    ("Τι εγκαθίσταται", BOLD),
    ("Τα αρχεία της εφαρμογής, κανονικά στο C:\\Program Files\\SMS", BULLET),
    (
        "Καταχωρίσεις στο μενού Έναρξη, και συντόμευση στην επιφάνεια εργασίας αν είναι σημειωμένο το αντίστοιχο κουτί",
        BULLET,
    ),
    ("", EMPTY),
    ("Πατήστε Επόμενο για να συνεχίσετε.", TEXT),
]

# ---------------------------------------------------------------------------------------------
# After the files are copied. For the Docker edition the wizard's next page builds the image
# (run_docker_install.cmd: DOCKER.ps1 -Install -Silent -NoShortcut); it does not start the
# application. For SMS Lite the next page is the last one.
# ---------------------------------------------------------------------------------------------

COMPLETE_EN = [
    ("The files are installed", TITLE),
    ("", EMPTY),
    (
        f"Student Management System {VERSION} is on this computer. What comes next depends on the edition.",
        TEXT,
    ),
    ("", EMPTY),
    ("Docker Production Edition", BOLD),
    (
        (
            "On the next page the wizard builds the application's Docker image, in a console window. "
            "The first time this takes 5-10 minutes, and Docker Desktop has to be running."
        ),
        BULLET,
    ),
    (
        (
            "The wizard does not start the application. Start it with the Student Management System "
            "shortcut: choose 1, START. It opens at http://localhost:8080"
        ),
        BULLET,
    ),
    (
        (
            "First sign-in with a new local database: the administrator's e-mail address and password are "
            "DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in the file config\\.env of the installation "
            "folder. The application asks for a new password at once."
        ),
        BULLET,
    ),
    (
        "With the shared QNAP database you sign in with your existing account there.",
        BULLET,
    ),
    ("", EMPTY),
    ("Native Lite Edition", BOLD),
    (
        "Start SMS Lite with the Student Management System shortcut. It opens in your browser.",
        BULLET,
    ),
    (
        "New local database: sign in with the administrator account you entered in this wizard.",
        BULLET,
    ),
    (
        (
            "Shared QNAP database, or a local database that was already on this PC: sign in with your "
            "existing account."
        ),
        BULLET,
    ),
    ("", EMPTY),
    ("Click Next to continue.", TEXT),
]

COMPLETE_EL = [
    ("Τα αρχεία εγκαταστάθηκαν", TITLE),
    ("", EMPTY),
    (
        (
            f"Το Student Management System {VERSION} βρίσκεται σε αυτόν τον υπολογιστή. Το επόμενο βήμα "
            "εξαρτάται από την έκδοση."
        ),
        TEXT,
    ),
    ("", EMPTY),
    ("Έκδοση Docker Production", BOLD),
    (
        (
            "Στην επόμενη σελίδα ο οδηγός χτίζει το Docker image της εφαρμογής, σε παράθυρο κονσόλας. "
            "Την πρώτη φορά αυτό διαρκεί 5-10 λεπτά, και το Docker Desktop πρέπει να είναι σε λειτουργία."
        ),
        BULLET,
    ),
    (
        (
            "Ο οδηγός δεν ξεκινά την εφαρμογή. Ξεκινήστε την με τη συντόμευση Student Management System: "
            "επιλέξτε 1, START. Ανοίγει στη διεύθυνση http://localhost:8080"
        ),
        BULLET,
    ),
    (
        (
            "Πρώτη σύνδεση με νέα τοπική βάση: το email και ο κωδικός του διαχειριστή είναι τα "
            "DEFAULT_ADMIN_EMAIL και DEFAULT_ADMIN_PASSWORD στο αρχείο config\\.env του φακέλου "
            "εγκατάστασης. Η εφαρμογή ζητά αμέσως νέο κωδικό."
        ),
        BULLET,
    ),
    ("Με την κοινή βάση QNAP συνδέεστε με τον υπάρχοντα λογαριασμό σας εκεί.", BULLET),
    ("", EMPTY),
    ("Lite Edition", BOLD),
    (
        "Ξεκινήστε το SMS Lite με τη συντόμευση Student Management System. Ανοίγει στον browser σας.",
        BULLET,
    ),
    (
        "Νέα τοπική βάση: συνδεθείτε με τον λογαριασμό διαχειριστή που δώσατε σε αυτόν τον οδηγό.",
        BULLET,
    ),
    (
        (
            "Κοινή βάση QNAP, ή τοπική βάση που υπήρχε ήδη σε αυτόν τον υπολογιστή: συνδεθείτε με τον "
            "υπάρχοντα λογαριασμό σας."
        ),
        BULLET,
    ),
    ("", EMPTY),
    ("Πατήστε Επόμενο για να συνεχίσετε.", TEXT),
]

# file name -> (code page of the text, lines)
PAGES: dict[str, tuple[int, list[tuple[str, str]]]] = {
    "installer_welcome.rtf": (1252, WELCOME_EN),
    "installer_complete.rtf": (1252, COMPLETE_EN),
    "installer_welcome_el.rtf": (1253, WELCOME_EL),
    "installer_complete_el.rtf": (1253, COMPLETE_EL),
}


def rtf_escape(text: str, codepage: int = 1253) -> str:
    encoded = text.encode(f"cp{codepage}", errors="strict")
    chunks: list[str] = []
    for byte in encoded:
        char = chr(byte)
        if char == "\\":
            chunks.append(r"\\")
        elif char == "{":
            chunks.append(r"\{")
        elif char == "}":
            chunks.append(r"\}")
        elif 32 <= byte <= 126:
            chunks.append(char)
        else:
            chunks.append(rf"\'{byte:02x}")
    return "".join(chunks)


def build_rtf(lines: list[tuple[str, str]], codepage: int = 1253) -> str:
    body: list[str] = [
        rf"{{\rtf1\ansi\ansicpg{codepage}\deff0",
        r"{\fonttbl{\f0 Segoe UI;}}",
        r"{\colortbl;\red0\green51\blue102;}",
        r"\viewkind4\uc1\pard\f0\fs22",
    ]

    for text, kind in lines:
        escaped = rtf_escape(text, codepage)
        if kind == TITLE:
            body.append(rf"\cf1\fs28\b {escaped}\b0\fs22\cf0\par")
        elif kind == BOLD:
            body.append(rf"\b {escaped}\b0\par")
        elif kind == BULLET:
            body.append(rf"\bullet  {escaped}\par")
        elif kind == TEXT:
            body.append(rf"{escaped}\par")
        elif kind == EMPTY and not text:
            body.append(r"\par")
        else:
            raise ValueError(f"unknown kind of line: {kind!r} ({text!r})")

    body.append("}")
    return "\n".join(body) + "\n"


def write_rtf(path: Path, lines: list[tuple[str, str]], codepage: int = 1253) -> None:
    content = build_rtf(lines, codepage)
    path.write_text(content, encoding="ascii", newline="\n")
    print(f"[OK] Generated: {path}")


def main() -> None:
    print("=" * 70)
    print("Installer information pages for Inno Setup (English and Greek)")
    print("=" * 70)
    print(f"Version: {VERSION}")
    print("Encoding: UTF-8 source -> RTF with code-page escapes (Greek: CP1253)")
    print()

    INSTALLER_DIR.mkdir(exist_ok=True)
    for name, (codepage, lines) in PAGES.items():
        write_rtf(INSTALLER_DIR / name, lines, codepage)

    print()
    print("=" * 70)
    print("[OK] Information pages generated")
    print("=" * 70)
    print("These files are written anew at every installer build, with the version")
    print("of the VERSION file. Change the lines in this script, not the files.")


if __name__ == "__main__":
    main()
