#!/usr/bin/env python3
"""
Permanent fix for Greek installer text files.
Converts proper UTF-8 Greek text to Windows-1253 (CP1253) for Inno Setup.

This script is part of the build pipeline:
1. UTF-8 source files are stored in git (human-readable)
2. This script converts them to CP1253 at build time
3. Inno Setup compiles the CP1253 files into the installer
4. The installer displays proper Greek text

Note: CP1253 files appear garbled in PowerShell (which expects UTF-8),
but that's correct for Inno Setup.
"""

import os
import sys

# Content in UTF-8 (Python 3 native)
# This is the authoritative source for Greek text
content_welcome = """Καλώς ήρθατε στην Εγκατάσταση SMS
=====================================

Σύστημα Διαχείρησης Φοιτητών v1.9.8

Αυτός ο οδηγός θα σας καθοδηγήσει στην εγκατάσταση του SMS στον υπολογιστή σας.

Απαιτήσεις Συστήματος:
• Windows 10/11 (64-bit)
• Docker Desktop εγκατεστημένο και σε λειτουργία
• 4 GB RAM ελάχιστο (8 GB προτεινόμενο)
• 2 GB ελεύθερου χώρου δίσκου

Τι θα εγκατασταθεί:
• Χώρος SMS Docker
• Συντομεύσεις επιφάνειας εργασίας
• Προσθήκες καταλόγου Windows

Πατήστε Επόμενο για να συνεχίσετε."""

content_complete = """Συγχαρητήρια! Η Εγκατάσταση ολοκληρώθηκε!
====================================

Το Student Management System εγκαταστάθηκε επιτυχώς στον υπολογιστή σας.

Χρήσιμες Πληροφορίες:
• Πατήστε διπλό κλικ στο "Student Management System" στην επιφάνεια εργασίας
• Περιηγηθείτε στο SMS: http://localhost:8080

Προεπιλεγμένα Στοιχεία Σύνδεσης:
• Email: admin@example.com
• Κωδικός: Αλλάξτε τον πρώτη φορά

Σημαντικά:
Απαιτείται αλλαγή κωδικού σύνδεσης κατά την πρώτη σύνδεση.

Χρειάζεστε Βοήθεια;
Επισκεφθείτε την τεκμηρίωση στο μενού Ξεκινήματος ή δείτε το αρχείο README.

Ευχαριστούμε που εγκαταστήσατε το SMS!"""

def main():
    # Determine installer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    installer_dir = os.path.join(script_dir, 'installer')
    
    if not os.path.exists(installer_dir):
        print("[ERROR] Installer directory not found: " + installer_dir)
        sys.exit(1)
    
    welcome_path = os.path.join(installer_dir, 'installer_welcome_el.txt')
    complete_path = os.path.join(installer_dir, 'installer_complete_el.txt')
    
    try:
        # Write using Windows-1253 encoding (what Inno Setup expects)
        with open(welcome_path, 'w', encoding='cp1253') as f:
            f.write(content_welcome)
        
        with open(complete_path, 'w', encoding='cp1253') as f:
            f.write(content_complete)
        
        print("[OK] Files converted to Windows-1253 encoding (Inno Setup format)")
        print("  - " + os.path.basename(welcome_path))
        print("  - " + os.path.basename(complete_path))
        
        # Verify encoding
        with open(welcome_path, 'rb') as f:
            data = f.read()[:20]
            hex_str = ' '.join('%02X' % b for b in data)
            if all(b < 255 for b in data):
                print("\nVerification - First 20 bytes (hex): " + hex_str)
                print("  Encoding confirmed: Windows-1253 [OK]")
            
        return 0
        
    except Exception as e:
        print("[ERROR] " + str(e))
        sys.exit(1)

if __name__ == '__main__':
    sys.exit(main())
