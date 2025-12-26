import sys
import pytest

nodeids = [
    "backend/tests/test_auth_refresh.py::test_refresh_rotation_and_logout",
    "backend/tests/test_auth_refresh.py::test_refresh_expiry",
    "backend/tests/test_auth_router.py::test_me_requires_token",
    "backend/tests/test_change_password.py::test_change_password_flow",
]

if __name__ == '__main__':
    # Run pytest with the specified nodeids
    ret = pytest.main(nodeids + ["-q"]) 
    sys.exit(ret)
