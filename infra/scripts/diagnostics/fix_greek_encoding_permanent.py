#!/usr/bin/env python3
"""
Generate Greek RTF installer info pages for Inno Setup.

This script is part of the installer build pipeline. It regenerates the Greek
welcome/completion Rich Text files from UTF-8 source strings and encodes Greek
characters as CP1253 RTF escape sequences, which Inno Setup renders reliably.

Outputs:
    installer/installer_welcome_el.rtf
    installer/installer_complete_el.rtf
"""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).parent
INSTALLER_DIR = ROOT / "installer"
VERSION_FILE = ROOT / "VERSION"


def read_version() -> str:
    try:
        return VERSION_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return "v1.14.0"


VERSION = read_version()


WELCOME_LINES = [
    ("Καλώς ήρθατε στην Εγκατάσταση SMS", True),
    ("", False),
    (f"Έκδοση Εγκατάστασης Συστήματος {VERSION}", True),
    ("", False),
    (
        "Αυτός ο οδηγός θα σας καθοδηγήσει στην εγκατάσταση του SMS στον υπολογιστή σας.",
        False,
    ),
    ("", False),
    ("Απαιτήσεις Συστήματος:", True),
    ("- Windows 10/11 (64-bit)", False),
    ("- Docker Desktop εγκατεστημένο και ενεργοποιημένο", False),
    ("- 4 GB RAM ελάχιστο (8 GB συνιστάται)", False),
    ("- 2 GB διαθέσιμο χώρο δίσκου", False),
    ("", False),
    ("Θα εγκατασταθούν:", True),
    ("- SMS Docker Application", False),
    ("- Συντομεύσεις εκκίνησης επιφάνειας", False),
    ("- Τεκμηρίωση χρήστη συστήματος", False),
    ("", False),
    ("Πατήστε Επόμενο για να συνεχίσετε.", False),
]

COMPLETE_LINES = [
    ("Συγχαρητήρια! Η Εγκατάσταση Ολοκληρώθηκε", True),
    ("", False),
    (f"Το SMS {VERSION} είναι έτοιμο να χρησιμοποιηθεί σε αυτό το σύστημα.", False),
    ("", False),
    ("Σημαντικές Πληροφορίες:", True),
    ("", False),
    ("- Το Docker Desktop πρέπει να είναι ανοιχτό", False),
    ("- Η πρώτη εκκίνηση θα διαρκέσει 5-10 λεπτά (κατέβασμα container)", False),
    ("- Το σύστημα ανοίγει στον τοπικό browser", False),
    ("", False),
    ("Καλωσορίσατε και καλορίσατε στο SMS!", False),
]


def rtf_escape(text: str) -> str:
    encoded = text.encode("cp1253", errors="strict")
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


def build_rtf(lines: list[tuple[str, bool]]) -> str:
    body: list[str] = [
        r"{\rtf1\ansi\ansicpg1253\deff0",
        r"{\fonttbl{\f0 Segoe UI;}}",
        r"{\colortbl;\red0\green51\blue102;}",
        r"\viewkind4\uc1\pard\cf1\f0\fs24",
    ]

    for text, bold in lines:
        prefix = r"\b " if bold else ""
        suffix = r"\b0" if bold else ""
        if text:
            body.append(f"{prefix}{rtf_escape(text)}{suffix}\\par")
        else:
            body.append(r"\par")

    body.append("}")
    return "\n".join(body) + "\n"


def write_rtf(path: Path, lines: list[tuple[str, bool]]) -> None:
    content = build_rtf(lines)
    path.write_text(content, encoding="ascii", newline="\n")
    print(f"[OK] Generated: {path}")


def main() -> None:
    print("=" * 70)
    print("Greek RTF Generator for Inno Setup")
    print("=" * 70)
    print(f"Version: {VERSION}")
    print("Encoding: UTF-8 source -> CP1253 RTF escapes")
    print()

    INSTALLER_DIR.mkdir(exist_ok=True)
    write_rtf(INSTALLER_DIR / "installer_welcome_el.rtf", WELCOME_LINES)
    write_rtf(INSTALLER_DIR / "installer_complete_el.rtf", COMPLETE_LINES)

    print()
    print("=" * 70)
    print("[OK] Greek RTF generation complete")
    print("=" * 70)
    print("These files are regenerated during installer builds to keep Greek")
    print("content version-aware and encoding-safe for Inno Setup.")


if __name__ == "__main__":
    main()
