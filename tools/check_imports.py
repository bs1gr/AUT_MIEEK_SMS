import sys
import importlib
import traceback
import os
print('CWD:', os.getcwd())
print('sys.path[0]:', sys.path[0])
try:
    importlib.import_module('backend.db')
    print('Imported backend.db successfully')
except Exception:
    traceback.print_exc()
