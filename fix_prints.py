#!/usr/bin/env python3
import re

with open("backend/scripts/migrate/runner.py", "r") as f:
    content = f.read()

# Replace all print(..., flush=True) with _safe_print(...)
content = re.sub(r'print\((.*?),\s*flush=True\)', r'_safe_print(\1)', content, flags=re.DOTALL)

with open("backend/scripts/migrate/runner.py", "w") as f:
    f.write(content)

print("Done - replaced print calls")
