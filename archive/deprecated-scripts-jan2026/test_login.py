#!/usr/bin/env python3
"""Test login endpoint"""

import requests
import json

response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "admin@example.com", "password": "admin"},
    headers={"Content-Type": "application/json"},
)

print(f"Status: {response.status_code}")
print(f"Response:\n{json.dumps(response.json(), indent=2)}")
