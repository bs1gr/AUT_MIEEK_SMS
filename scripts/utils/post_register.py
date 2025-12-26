import json
import urllib.request

url = "http://127.0.0.1:8000/api/v1/auth/register"
payload = {
    "email": "e2e-test@example.test",
    "password": "E2E-Password-1!",  # pragma: allowlist secret
    "full_name": "E2E User",
    "role": "teacher",
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url, data=data, headers={"Content-Type": "application/json"}
)
try:
    resp = urllib.request.urlopen(req, timeout=5)
    body = resp.read().decode("utf-8")
    print("STATUS", resp.getcode())
    print("BODY", body)
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8")
    print("HTTP ERROR", e.code)
    print(body)
except Exception as e:
    print("ERROR", e)
