#!/usr/bin/env python3
"""
Greek Text Encoding Converter for Inno Setup Installer

This script converts UTF-8 Greek text to Windows-1253 (CP1253) encoding
for proper display in Inno Setup installers. It's part of the build pipeline
and runs automatically during installer compilation.

Technical Details:
- Source: UTF-8 Greek text (human-readable, version control friendly)
- Target: Windows-1253 (CP1253) - required by Inno Setup for Greek language
- Triggers: INSTALLER_BUILDER.ps1, CI/CD workflows, RELEASE_READY.ps1
- Output: installer/installer_welcome_el.txt, installer/installer_complete_el.txt

Usage:
    python fix_greek_encoding_permanent.py

See: docs/GREEK_ENCODING_FIX.md for complete documentation
"""

from pathlib import Path

# Read VERSION file
version_file = Path(__file__).parent / "VERSION"
try:
    with open(version_file, "r", encoding="utf-8") as f:
        VERSION = f.read().strip()
except FileNotFoundError:
    VERSION = "1.14.0"  # Fallback

# Greek text content for welcome screen
content_welcome = f"""Καλώς ήρθατε στην Εγκατάσταση SMS
=====================================

Έκδοση Εγκατάστασης Συστήματος {VERSION}

Αυτός ο οδηγός θα σας καθοδηγήσει στην εγκατάσταση του SMS στον υπολογιστή σας.

Απαιτήσεις Συστήματος:
- Windows 10/11 (64-bit)
- Docker Desktop εγκατεστημένο και ενεργοποιημένο
- 4 GB RAM ελάχιστο (8 GB συνιστάται)
- 2 GB διαθέσιμο χώρο δίσκου

Θα εγκατασταθούν:
- SMS Docker Application
- Συντομεύσεις εκκίνησης επιφάνειας
- Τεκμηρίωση χρήστη συστήματος

Πατήστε Επόμενο για να συνεχίσετε.
"""

# Greek text content for completion screen
content_complete = f"""Συγχαρητήρια! Η Εγκατάσταση Ολοκληρώθηκε
=============================================

Το SMS {VERSION} είναι έτοιμο να χρησιμοποιηθεί σε αυτό το σύστημα.

Σημαντικές Πληροφορίες:

- Το Docker Desktop πρέπει να είναι ανοιχτό
- Η πρώτη εκκίνηση θα διαρκέσει 5-10 λεπτά (κατέβασμα container)
- Το σύστημα ανοίγει στον τοπικό browser

Καλωσορίσατε και καλορίσατε στο SMS!
"""


def write_cp1253_file(filepath: Path, content: str) -> None:
    """Write content to file using Windows-1253 encoding"""
    try:
        with open(filepath, "w", encoding="cp1253") as f:
            f.write(content)
        print(f"✓ Generated: {filepath} (CP1253 encoding)")
    except Exception as e:
        print(f"✗ Failed to write {filepath}: {e}")
        raise


def main():
    """Convert Greek text files from UTF-8 to Windows-1253"""
    print("=" * 70)
    print("Greek Text Encoding Converter for Inno Setup")
    print("=" * 70)
    print(f"Version: {VERSION}")
    print("Encoding: UTF-8 -> Windows-1253 (CP1253)")
    print()

    # Define output paths
    installer_dir = Path(__file__).parent / "installer"
    welcome_file = installer_dir / "installer_welcome_el.txt"
    complete_file = installer_dir / "installer_complete_el.txt"

    # Ensure installer directory exists
    installer_dir.mkdir(exist_ok=True)

    # Write files
    write_cp1253_file(welcome_file, content_welcome)
    write_cp1253_file(complete_file, content_complete)

    print()
    print("=" * 70)
    print("✓ Greek text encoding conversion complete")
    print("=" * 70)
    print()
    print("Note: Files appear garbled in UTF-8 editors but display correctly")
    print("in Inno Setup because it reads them as Windows-1253 (CP1253).")
    print()
    print("To verify: Compile installer and check Greek language screens.")


if __name__ == "__main__":
    main()
