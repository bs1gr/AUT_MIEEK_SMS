# Greek Encoding Fix for Inno Setup Installer (v1.9.7)

## Problem Solved

The installer was displaying corrupted Greek text (mojibake) in the license, welcome, and completion screens. After extensive troubleshooting, the root cause was identified and fixed.

## Root Cause

- **Before**: Greek language files were declared as Windows-1253 (`LanguageCodePage=1253`) but contained UTF-8 content
- **Result**: Inno Setup interpreted UTF-8 bytes as Windows-1253, producing garbled characters
- **Example**: Greek "Άδεια" (License) displayed as corrupted escape sequences

## Solution Implemented (v1.9.7+)

### Greek.isl Language File

- Changed from `LanguageCodePage=1253` → `LanguageCodePage=65001` (UTF-8)
- File remains UTF-8 with BOM (EF BB BF header)
- Tells Inno Setup to interpret content as UTF-8

### Greek Text Files

All Greek content files use UTF-8 with BOM encoding:

- `installer/LICENSE_EL.txt` - Greek license text
- `installer/installer_welcome_el.txt` - Greek welcome message
- `installer/installer_complete_el.txt` - Greek completion message

### Automated Fix via GREEK_ENCODING_AUDIT.ps1

The build pipeline automatically:

- Verifies Greek.isl has `LanguageCodePage=65001`
- Ensures all .txt files are UTF-8 with BOM
- Runs during `INSTALLER_BUILDER.ps1` build process

## Technical Details

### Inno Setup CodePage Reference

| CodePage | Encoding | Usage |
|----------|----------|-------|
| 1253 | Windows-1253 (CP1253) | Legacy Greek (deprecated) |
| 65001 | UTF-8 | Modern Unicode (recommended) |
| 0408 | Greek Language ID | UI language selection |

### File Encoding Verification

```powershell
# Check if file is UTF-8 with BOM
$bytes = [System.IO.File]::ReadAllBytes("installer/LICENSE_EL.txt") | Select-Object -First 3
# Should show: EF BB BF (UTF-8 BOM)
```

### Build Pipeline Integration

The `INSTALLER_BUILDER.ps1` script automatically:

1. Verifies version consistency
2. Runs `GREEK_ENCODING_AUDIT.ps1 -Fix` to validate/fix encodings
3. Compiles installer with Inno Setup
4. Signs with AUT MIEEK certificate

## Testing Results

✅ **Successfully Verified in v1.9.7.exe**:

- License content displays readable Greek text ("Άδεια MIT", license terms, etc.)
- Welcome message shows proper Greek characters
- Completion message renders correctly
- No mojibake or escape sequences visible

## Prevention for Future Releases

To maintain proper Greek encoding in future updates:

1. **Never edit Greek files in tools that force Windows-1253** (e.g., Notepad on non-Greek systems)
2. **Use UTF-8 compatible editors** (VS Code, Notepad++, etc.)
3. **Run `GREEK_ENCODING_AUDIT.ps1 -Audit`** before committing changes
4. **Run `INSTALLER_BUILDER.ps1 -Action build`** which automatically fixes any encoding issues

## References

- [Inno Setup Language File Format](https://jrsoftware.org/ishelp/index.php?topic=componentslanguages)
- [UTF-8 with BOM (EF BB BF)](https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8)
- `installer/GREEK_ENCODING_AUDIT.ps1` - Automated validation script
- `INSTALLER_BUILDER.ps1` - Build pipeline with encoding checks

## Changelog

- **v1.9.7**: Fixed Greek encoding to use UTF-8 with BOM + LanguageCodePage=65001
  - Changed from Windows-1253 approach to UTF-8
  - Updated GREEK_ENCODING_AUDIT.ps1 to enforce UTF-8 with BOM
  - Updated Greek.isl to declare LanguageCodePage=65001
  - Verified all Greek text displays correctly in installer
