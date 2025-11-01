import importlib
import traceback

try:
    importlib.import_module('backend.db')
    print('Imported backend.db successfully')
except Exception:
    traceback.print_exc()
