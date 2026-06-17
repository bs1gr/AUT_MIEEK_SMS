# Android Remote Access Guide — Tailscale + Capacitor

**Version**: v1.18.30+
**Date**: June 2026
**Applies to**: Android APK (Capacitor) connecting to the native Windows backend over the internet

---

## Architecture

```
Android Phone (Capacitor APK)
        │  Tailscale VPN (encrypted P2P, no port forwarding)
        ▼
Windows PC — uvicorn on 0.0.0.0:8000
        │
        ▼
QNAP PostgreSQL (172.16.0.2:55433)
```

The Android app wraps the React frontend in a Capacitor WebView.
All API calls go from the phone to the Windows backend over Tailscale.
The backend talks to QNAP PostgreSQL over the local LAN.

---

## Why Tailscale (not DDNS or QNAP reverse proxy)

| Approach | Outcome |
|---|---|
| myQNAPcloud DDNS + port forwarding | ISP blocks all inbound ports — connection refused |
| QNAP QTS Reverse Proxy | Hostname-based only (no URI/path routing); port 443 conflicts with QTS HTTPS |
| myQNAPcloud SmartURL (qlink.to) | Opens QNAP app on Android — shows "device not registered" |
| **Tailscale** | ✅ Encrypted P2P tunnel, bypasses ISP blocking, zero config |

---

## Setup

### 1. Install Tailscale

Install Tailscale on both the Windows PC and the Android phone.
Log in to the same Tailscale account on both devices.

After connecting, the Windows PC gets a Tailscale IP in the `100.x.x.x` range.
Check it with: `ipconfig` → look for the Tailscale adapter.

### 2. Start the backend (Windows PC)

```powershell
.\infra\scripts\dev\NATIVE.ps1 -Start
```

The backend binds to `0.0.0.0:8000` — it's accessible from all interfaces including Tailscale.
Verify with: `http://localhost:8000/health`

### 3. Windows Firewall

Allow inbound TCP on port 8000:

```powershell
New-NetFirewallRule -DisplayName "SMS Backend (Tailscale)" `
  -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

### 4. Configure the Android app

Launch the APK. On first run it shows the **Server Setup** screen.

Select **Local Network** and enter:
- IP: `100.x.x.x` (your Windows PC's Tailscale IP)
- Port: `8000`

The app stores `http://100.x.x.x:8000/api/v1` and navigates to the login page.

### 5. Log in

- Email: `admin@sms-lite.app`
- Password: `AdminPassword123!`

---

## CORS Configuration

The backend `.env` must include `capacitor://localhost` in `CORS_ORIGINS`
(this is the WebView origin that Capacitor uses for all requests):

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:8000,http://localhost,https://localhost,capacitor://localhost
```

This is the default in `.env.example`. Check `src/backend/.env` locally.

---

## Admin credentials

The admin account lives in the QNAP PostgreSQL database:

| Field | Value |
|---|---|
| Email | `admin@sms-lite.app` |
| Password | `AdminPassword123!` |
| Role | `admin` |
| DB | `postgresql://sms_user:***@172.16.0.2:55433/student_management` |

### Resetting the admin password

If you need to reset, use the backend's own hasher (PBKDF2-SHA256).
**Do not use raw bcrypt** — the backend uses PBKDF2 and the hashes are incompatible.

```python
# reset_admin.py — run from project root
import sys
sys.path.insert(0, 'src/backend')
from sqlalchemy import create_engine, text
from security.password_hash import get_password_hash

engine = create_engine('postgresql://sms_user:TestAdmin2026!@172.16.0.2:55433/student_management')
hashed = get_password_hash('AdminPassword123!')

with engine.connect() as conn:
    conn.execute(text("UPDATE users SET hashed_password = :h WHERE email = 'admin@sms-lite.app'"), {'h': hashed})
    conn.commit()
    print('Done. Hash prefix:', hashed[:12])
```

Verify with:

```python
# test_login.py
import requests
r = requests.post('http://localhost:8000/api/v1/auth/login',
                  json={'email': 'admin@sms-lite.app', 'password': 'AdminPassword123!'})
print(r.status_code, r.json())  # expect 200
```

---

## Capacitor WebView — Known Quirks

These are permanent quirks of the Android Capacitor WebView that differ from a regular browser.

### 1. HTML5 form validation is silently ignored

`required`, `type="email"`, and `minlength` attributes do **not** show validation
popups in the Capacitor WebView. The form submits regardless of empty or invalid fields.

**Fix**: Always validate in JavaScript before making the API call.
See `LoginWidget.tsx` `submit()` function for the pattern.

### 2. Android autofill bypasses React `onChange`

When Android's password manager or autofill fills a field, it does so at the DOM level
without triggering React's `onChange` event. React state stays `""` while the field
visually shows the filled value.

**Fix**: Use a `ref` on each input and read `ref.current.value` in the submit handler.
Also add `onInput` alongside `onChange` to catch future autofill events.

```tsx
const emailRef = useRef<HTMLInputElement>(null);

// In submit:
const actualEmail = (emailRef.current?.value ?? email).trim();

// On the input:
<Input
  ref={emailRef}
  onChange={(e) => setEmail(e.target.value)}
  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
/>
```

### 3. The WebView origin is `capacitor://localhost`

All API requests from the Capacitor app originate from `capacitor://localhost`.
This is a cross-origin request to `http://100.x.x.x:8000`, so CORS applies.
The backend CORS config must explicitly list `capacitor://localhost`.

### 4. Android autocapitalize / autocorrect breaks email

Without explicit attributes, Android may capitalize `admin@sms-lite.app` → `Admin@sms-lite.app`
or autocorrect the domain portion. Always set on email inputs:

```tsx
autoCapitalize="none"
autoCorrect="off"
spellCheck={false}
inputMode="email"
```

### 5. The Capacitor WebView origin for API routing

The stored server URL (set in ServerSetupPage) becomes the Axios `baseURL` at runtime.
All relative API paths (e.g. `/auth/login`) are appended to it via `combineURLs`.

- "Local Network" type stores: `http://<IP>:<port>/api/v1` ← correct, `/api/v1` included
- "Custom URL" type stores exactly what the user typed ← user must include `/api/v1`

If the URL is missing `/api/v1`, requests go to wrong paths and return 404.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Request validation failed" (422) | Empty form submitted (autofill bypassed onChange) | Already fixed in current code; ensure APK is rebuilt |
| "Invalid email or password" (400) | Wrong credentials or wrong password hash scheme | Reset password using `get_password_hash` from backend |
| Login shows error key like `auth.emailRequired` | i18n key not resolving in this component context | Use hardcoded bilingual strings for validation messages |
| No backend activity in terminal | Request going to wrong URL or different machine | Check stored URL in phone's localStorage via Chrome inspect |
| 404 on all requests | Stored URL missing `/api/v1` suffix | Go back to server setup; use "Local Network" type (auto-appends `/api/v1`) |
| Connection refused | Backend not running or firewall blocking port 8000 | `.\NATIVE.ps1 -Start`, add firewall rule |
| Tailscale IP unreachable | Tailscale not connected on PC or phone | Open Tailscale app on both devices, ensure both show "Connected" |

---

## Debugging Android Network Requests

To see console output from the Android WebView on a PC:

1. Connect Android phone to PC via USB, enable USB debugging
2. Open `chrome://inspect` in Chrome on PC
3. Click **inspect** under the SMS app WebView
4. Console tab shows all `console.log` / `console.error` output

The login form logs:
```
[Login] email: "admin@sms-lite.app" len: 19
[Login 422] {"success":false,"error":{"code":"VALIDATION_ERROR",...}}
```
