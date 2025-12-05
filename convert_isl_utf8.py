#!/usr/bin/env python3
"""Convert Greek.isl from CP1253 to UTF-8"""

with open('installer/Greek.isl', 'rb') as f:
    cp1253_bytes = f.read()

# Decode from CP1253
text = cp1253_bytes.decode('cp1253')
print(f"Decoded Greek.isl from CP1253: {len(text)} characters")

# Add UTF-8 BOM
utf8_bom = b'\xef\xbb\xbf'
utf8_bytes = utf8_bom + text.encode('utf-8')

# Write back as UTF-8 with BOM
with open('installer/Greek.isl', 'wb') as f:
    f.write(utf8_bytes)

print(f"Wrote Greek.isl as UTF-8 with BOM: {len(utf8_bytes)} bytes")

# Verify
with open('installer/Greek.isl', 'rb') as f:
    verify = f.read()

if verify.startswith(b'\xef\xbb\xbf'):
    print("Verification: ✓ UTF-8 BOM present")
    try:
        decoded = verify[3:].decode('utf-8')
        print(f"Verification: ✓ UTF-8 decode valid ({len(decoded)} characters)")
    except Exception as e:
        print(f"ERROR: {e}")
else:
    print("ERROR: BOM not present")

print("\nGreek.isl is now UTF-8 (same encoding as other Greek text files)")
