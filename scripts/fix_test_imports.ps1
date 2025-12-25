# Script to fix imports in backend tests to use db_setup instead of conftest
# Run from repository root: .\scripts\fix_test_imports.ps1
$ErrorActionPreference = 'Stop'

$pythonScript = @"
import os
import re

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        return

    new_lines = []
    modified = False

    for line in lines:
        # Check for import from backend.tests.conftest
        match = re.match(r'^from backend\.tests\.conftest import (.*)$', line)
        if match:
            imports_part = match.group(1).strip()
            if '#' in imports_part:
                imports_part = imports_part.split('#')[0].strip()

            # Split by comma and clean whitespace
            imported_items = [x.strip() for x in imports_part.split(',') if x.strip()]

            conftest_items = []
            db_setup_items = []

            for item in imported_items:
                # Handle aliases like 'engine as db_engine'
                base_name = item.split(' as ')[0].strip()
                if base_name in ['TestingSessionLocal', 'engine']:
                    db_setup_items.append(item)
                else:
                    conftest_items.append(item)

            if db_setup_items:
                modified = True
                # Reconstruct imports
                if conftest_items:
                    new_lines.append(f'from backend.tests.conftest import {", ".join(conftest_items)}\n')
                new_lines.append(f'from backend.tests.db_setup import {", ".join(db_setup_items)}\n')
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f'Fixed imports in: {filepath}')

def main():
    target_dir = os.path.join('backend', 'tests')
    if not os.path.exists(target_dir):
        print(f'Directory not found: {target_dir}')
        return

    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith('.py'):
                fix_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
"@

$tempScript = Join-Path $env:TEMP "fix_imports_temp.py"
Set-Content -Path $tempScript -Value $pythonScript -Encoding UTF8

Write-Host "Running smart import fix script..." -ForegroundColor Cyan
python $tempScript
Remove-Item $tempScript
Write-Host "Import fix complete." -ForegroundColor Green
