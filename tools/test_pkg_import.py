import sys
import importlib
import traceback
import os

repo = os.path.abspath(os.path.join(os.getcwd()))
# Ensure repo root is on sys.path first
if repo not in sys.path:
    sys.path.insert(0, repo)
print("Inserted repo root into sys.path[0]:", sys.path[0])
try:
    importlib.import_module("backend.main")
    print("Imported backend.main successfully")
except Exception:
    traceback.print_exc()
