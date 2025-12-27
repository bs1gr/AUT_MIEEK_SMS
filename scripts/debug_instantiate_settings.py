from backend.config import Settings
import os

# Test 1: auth_disabled_allows_placeholder_secret_key
os.environ["PYTEST_CURRENT_TEST"] = "config/test"
try:
    s = Settings(
        SECRET_KEY="dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345",  # pragma: allowlist secret
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    # Avoid logging secrets; show length only
    print("Test1 OK, SECRET_KEY length ->", len(s.SECRET_KEY))
except Exception:
    import traceback

    traceback.print_exc()

# Test 2: secret_key_can_be_explicitly_set
os.environ["PYTEST_CURRENT_TEST"] = "config/test"
try:
    s2 = Settings(
        SECRET_KEY="explicitly-set-secret-key",  # pragma: allowlist secret
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    # Avoid logging secrets; show length only
    print("Test2 OK, SECRET_KEY length ->", len(s2.SECRET_KEY))
except Exception:
    import traceback

    traceback.print_exc()
