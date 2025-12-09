# tools/ (deprecated)

All utilities previously under `tools/` have been consolidated into `scripts/utils/` with backward-compatible stubs left here until **v1.12.0**. Prefer using the new paths below.

## New locations

- `scripts/utils/lint/run_mypy_per_file.py` (stub: `tools/run_mypy_per_file.py`)
- `scripts/utils/validators/import_checker.py` (stubs: `tools/check_imports*.py`, `tools/test_import_*.py`)
- `scripts/utils/backups/backup_tools.ps1` (stub: `tools/backup_tools.ps1`)
- `scripts/utils/ci/ci_list_now.ps1` (stub: `tools/ci_list_now.ps1`)
- `scripts/utils/ci/monitor_ci_issues.ps1` (stub: `tools/monitor_ci_issues.ps1`)
- `scripts/utils/ci/import_name_mapping.json` and `scripts/utils/ci/runs.json` (data moved)
- `scripts/utils/find_bad_paths.py`, `scripts/utils/remove_windows_reserved.py` (stubs in `tools/`)
- `scripts/utils/post_register.py`, `scripts/utils/release.py` (stubs in `tools/`)
- `scripts/utils/converters/convert_mieek_to_import.py`, `convert_pdf_to_import.py` (stubs in `tools/`)
- Sample inputs now live in `scripts/utils/converters/example_input_*.json` (legacy copies kept in `tools/`)
- Legacy installer assets moved to `scripts/utils/installer/` (stubs in `tools/installer/`)
- Markdown lint utility at `scripts/utils/lint/markdown_lint.py` (stub in `tools/lint/`)

## Example usage (PowerShell)

```powershell
cd D:/SMS/student-management-system
python scripts/utils/lint/run_mypy_per_file.py
powershell -File scripts/utils/ci/ci_list_now.ps1
powershell -File scripts/utils/backups/backup_tools.ps1 -Action grab -Destination C:/tmp
```

## Notes

- The stubs simply redirect to the consolidated paths and will be removed after the deprecation window.
- CI helpers require `gh` CLI or `GITHUB_TOKEN` when using API fallback.
- Backup helper expects repository backups under `backups/` at repo root.

## Contact

If you see a failing file reported by these utilities or notice stub breakage, open an issue so we can investigate platform differences.
