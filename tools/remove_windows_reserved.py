"""
Utility to remove a file named with a reserved Windows device name (e.g., "nul") using extended path prefix.
Run from repository root. Prints outcome.
"""
import os
from pathlib import Path

# Adjust this path if repository is elsewhere
repo_root = Path(r"D:\SMS\student-management-system")
reserved = repo_root / "nul"

# Use extended path prefix to operate on reserved names
p = r"\\?\\" + str(reserved)

print("Attempting to remove:", p)
print("Exists (normal):", reserved.exists())
print("Exists (extended):", os.path.exists(p))

try:
    os.unlink(p)
    print("Deleted (extended path)")
except Exception as e:
    print("Delete failed:", repr(e))
    # Try rename as fallback
    try:
        newname = repo_root / "nul._removed"
        os.rename(p, str(newname))
        print("Renamed to", newname)
    except Exception as e2:
        print("Rename failed:", repr(e2))
