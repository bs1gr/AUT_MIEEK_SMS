import sys
sys.path.insert(0, r'd:\SMS\student-management-system')
try:
    import backend.routers.routers_control as rc
    print('import_ok', True)
    print('has_router', hasattr(rc, 'router'))
except Exception as e:
    print('import_ok', False)
    print('error', type(e).__name__, str(e))
