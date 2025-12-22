#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Greek Text Encoding Fix for Inno Setup Installer

Converts authoritative UTF-8 Greek text to Windows-1253 (CP1253) encoding
for Inno Setup compilation. This script is part of the build-time pipeline.

Permanent Solution Architecture:
- Source files in git: UTF-8 (human-readable)
- Build-time: UTF-8 -> Windows-1253 conversion (this script)
- Inno Setup: Reads CP1253, embeds in installer
- Result: Correct Greek display in Windows

Usage:
    python fix_greek_encoding_permanent.py

The script:
1. Reads version from VERSION file (dynamic version)
2. Reads authoritative UTF-8 Greek text (defined in this script)
3. Updates version placeholders in Greek text
4. Converts to Windows-1253 (CP1253)
5. Writes to installer/*.txt files on disk
6. Returns 0 on success, 1 on error

This ensures every release automatically gets correct version number in Greek text.
"""

import sys
from pathlib import Path


def get_version():
    """Read version from VERSION file."""
    script_dir = Path(__file__).parent.resolve()
    version_file = script_dir / "VERSION"

    try:
        version = version_file.read_text(encoding="utf-8").strip()
        return version
    except Exception as e:
        print(f"WARNING: Could not read VERSION file: {e}")
        return "1.11.2"  # Fallback version


def get_greek_texts(version):
    """Generate Greek text with current version. Dynamic version support for future releases."""

    # Authoritative Greek text definitions (UTF-8)
    # Version is injected dynamically so each release gets correct version number
    greek_texts = {
        "welcome": """Καλώς ήρθατε στην Εγκατάσταση SMS
=====================================

Σύστημα Διαχείρισης Μαθητών v{version}

Αυτός ο οδηγός θα σας καθοδηγήσει στην εγκατάσταση του SMS στον υπολογιστή σας.

Απαιτήσεις Συστήματος:
- Windows 10/11 (64-bit)
- Docker Desktop εγκατεστημένο και λειτουργικό
- 4 GB RAM ελάχιστο (8 GB συνιστώμενο)
- 2 GB ελεύθερο χώρο δίσκου

Τι θα εγκατασταθεί:
- SMS Docker Application
- Συντομεύσεις επιφάνειας εργασίας
- Καταχωρήσεις μενού Έναρξης

Κάντε κλικ στο Επόμενο για να συνεχίσετε.""".format(version=version),
        "completion": """Συγχαρητήρια! Η Εγκατάσταση Ολοκληρώθηκε
=============================================

Το SMS v{version} είναι έτοιμο να χρησιμοποιηθεί σε λίγα λεπτά.

Σημαντικές Πληροφορίες:

- Το Docker Desktop πρέπει να είναι ενεργό
- Η πρώτη εκτέλεση θα διαρκέσει 5-10 λεπτά (κατασκευή container)
- Θα λάβετε ειδοποίηση όταν είναι έτοιμο

Ευχαριστούμε που χρησιμοποιείτε το SMS!""".format(version=version),
    }

    return greek_texts


def main():
    """Main entry point: convert Greek text to Windows-1253 and write to installer files."""

    try:
        # Determine paths
        script_dir = Path(__file__).parent.resolve()
        installer_dir = script_dir / "installer"

        if not installer_dir.exists():
            print(f"ERROR: Installer directory not found: {installer_dir}")
            return 1

        # Get current version from VERSION file (ensures next release has correct version)
        version = get_version()
        print(f"OK Reading Greek text template for version {version}")

        # Get Greek texts with current version injected
        greek_texts = get_greek_texts(version)

        # File mappings
        files = {
            "welcome": installer_dir / "installer_welcome_el.txt",
            "completion": installer_dir / "installer_complete_el.txt",
        }

        # Convert and write each file
        for file_key, filepath in files.items():
            try:
                # Get UTF-8 text
                text_utf8 = greek_texts.get(file_key)
                if not text_utf8:
                    print(f"WARNING: No Greek text definition for {file_key}")
                    continue

                # Encode to Windows-1253
                text_cp1253 = text_utf8.encode("cp1253", errors="replace")

                # Write to file
                with open(filepath, "wb") as f:
                    f.write(text_cp1253)

                print(f"OK Converted {filepath.name} to Windows-1253 (v{version})")

            except Exception as e:
                print(f"ERROR converting {file_key}: {e}")
                return 1

        print(f"OK Greek text encoding conversion completed successfully (v{version})")
        return 0

    except Exception as e:
        print(f"FATAL ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
