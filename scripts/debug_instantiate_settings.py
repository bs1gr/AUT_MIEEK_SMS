from backend.config import Settings
import os

# Test 1: auth_disabled_allows_placeholder_secret_key
os.environ['PYTEST_CURRENT_TEST'] = 'config/test'
try:
    s = Settings(
        SECRET_KEY='dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345',
        AUTH_ENABLED=False,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    print('Test1 OK, SECRET_KEY ->', s.SECRET_KEY)
except Exception as e:
    import traceback
    traceback.print_exc()

# Test 2: secret_key_can_be_explicitly_set
os.environ['PYTEST_CURRENT_TEST'] = 'config/test'
try:
    s2 = Settings(
        SECRET_KEY='explicitly-set-secret-key',
        AUTH_ENABLED=True,
        SECRET_KEY_STRICT_ENFORCEMENT=True,
    )
    print('Test2 OK, SECRET_KEY ->', s2.SECRET_KEY)
except Exception as e:
    import traceback
    traceback.print_exc()
