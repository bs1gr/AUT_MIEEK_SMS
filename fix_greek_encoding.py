#!/usr/bin/env python3
"""
FINAL DEFINITIVE FIX for Greek Installer Files
Converts all Greek text files from UTF-8 to CP1253 (no BOM)
"""

import os

files_to_fix = [
    'installer/LICENSE_EL.txt',
    'installer/installer_welcome_el.txt', 
    'installer/installer_complete_el.txt'
]

print('=' * 60)
print('FINAL DEFINITIVE FIX: UTF-8 → CP1253')
print('=' * 60)
print()

for fpath in files_to_fix:
    if not os.path.exists(fpath):
        print(f'ERROR: {fpath} not found')
        continue
    
    with open(fpath, 'rb') as f:
        raw_bytes = f.read()
    
    # Check current encoding
    is_utf8_bom = raw_bytes.startswith(b'\xef\xbb\xbf')
    current_enc = "UTF-8 with BOM" if is_utf8_bom else "Unknown"
    print(f'Processing {os.path.basename(fpath)}:')
    print(f'  Current: {current_enc}, Size: {len(raw_bytes)} bytes')
    
    # Remove BOM and decode as UTF-8
    if is_utf8_bom:
        raw_bytes = raw_bytes[3:]
    
    try:
        text = raw_bytes.decode('utf-8')
        print(f'  Decoded as UTF-8: {len(text)} characters')
    except Exception as e:
        print(f'  ERROR decoding: {e}')
        continue
    
    # Encode to CP1253 (NO BOM)
    try:
        cp1253_bytes = text.encode('cp1253')
        print(f'  Encoding to CP1253: {len(cp1253_bytes)} bytes')
    except Exception as e:
        print(f'  ERROR encoding: {e}')
        continue
    
    # Write back as pure CP1253 (no BOM)
    with open(fpath, 'wb') as f:
        f.write(cp1253_bytes)
    
    print(f'  Written as CP1253')
    
    # Verify
    with open(fpath, 'rb') as f:
        verify = f.read()
    
    has_bom = verify.startswith(b'\xef\xbb\xbf') or verify.startswith(b'\xff\xfe')
    try:
        decoded = verify.decode('cp1253')
        is_cp1253 = decoded == text
    except:
        is_cp1253 = False
    
    status = "✓ OK" if (not has_bom and is_cp1253) else "✗ FAILED"
    print(f'  Verification: BOM={has_bom}, CP1253_valid={is_cp1253} {status}')
    print()

print('=' * 60)
print('ALL FILES CONVERTED')
print('=' * 60)
