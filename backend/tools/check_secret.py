"""
Simple CI guard that fails if SECRET_KEY is unset or still the dev placeholder.
Exit code 1 if check fails.
"""
import os
import sys

PLACEHOLDER = "dev-placeholder-secret-CHANGE_THIS_FOR_PRODUCTION_012345"

def main():
    secret = os.environ.get("SECRET_KEY", "")
    env = os.environ.get("ENV") or os.environ.get("APP_ENV") or os.environ.get("PYTEST_CURRENT_TEST")

    # If running in test environment, skip strict check
    if env == "test" or env == "TEST" or os.environ.get("CI") == "true":
        # In CI we still want the check to run, so we don't skip on CI; only skip when ENV=test
        pass

    if not secret:
        print("ERROR: SECRET_KEY is not set. Set SECRET_KEY in environment for production builds.")
        sys.exit(1)

    if secret == PLACEHOLDER:
        print("ERROR: SECRET_KEY is set to the development placeholder. Replace it with a secure secret in CI/production.")
        sys.exit(1)

    print("SECRET_KEY check passed.")
    sys.exit(0)

if __name__ == '__main__':
    main()
