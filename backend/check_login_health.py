"""Health check for login functionality.

Tests that the login endpoint is accessible and can authenticate
the test user credentials.

Exit codes:
- 0: Login health check passed
- 1: Login health check failed
"""

import sys
import requests
from time import sleep


def check_login_health(base_url="http://127.0.0.1:8000", max_retries=3):
    """Check that login endpoint works with test credentials."""

    print(f"Checking login health at {base_url}...")

    login_url = f"{base_url}/api/v1/auth/login"
    test_credentials = {"username": "test@example.com", "password": "password123"}

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt}/{max_retries}: POST {login_url}")

            # Try to login with test credentials
            response = requests.post(
                login_url,
                data=test_credentials,  # FastAPI login uses form data
                timeout=10,
            )

            print(f"Response status: {response.status_code}")

            if response.status_code == 200:
                try:
                    data = response.json()
                    if "access_token" in data:
                        print(f"✅ Login successful! Token type: {data.get('token_type')}")
                        print(f"   Access token (first 20 chars): {data['access_token'][:20]}...")
                        return True
                    else:
                        print("⚠️  Login returned 200 but no access_token in response")
                        print(f"   Response: {data}")
                except Exception as e:
                    print(f"⚠️  Could not parse JSON response: {e}")
                    print(f"   Raw response: {response.text[:200]}")
            elif response.status_code == 401:
                print("❌ Login failed: Invalid credentials (401)")
                print(f"   Response: {response.text[:200]}")
                return False
            else:
                print(f"⚠️  Unexpected status code: {response.status_code}")
                print(f"   Response: {response.text[:200]}")

        except requests.exceptions.ConnectionError as e:
            print(f"⚠️  Connection error: {e}")
            if attempt < max_retries:
                print("   Retrying in 2 seconds...")
                sleep(2)
                continue

        except Exception as e:
            print(f"❌ Login health check error: {e}")
            import traceback

            traceback.print_exc()

        if attempt < max_retries:
            print(f"Retrying... ({attempt}/{max_retries})")
            sleep(1)

    print(f"❌ Login health check failed after {max_retries} attempts")
    return False


if __name__ == "__main__":
    success = check_login_health()
    sys.exit(0 if success else 1)
