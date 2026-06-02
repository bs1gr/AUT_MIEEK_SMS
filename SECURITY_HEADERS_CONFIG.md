# Security Headers & Configuration Guide

**Version:** 1.0  
**Date:** 2026-06-02  
**Purpose:** Secure HTTP headers and application security configuration

---

## Table of Contents

1. [Security Headers](#security-headers)
2. [CORS Configuration](#cors-configuration)
3. [Rate Limiting](#rate-limiting)
4. [Session Management](#session-management)
5. [HTTPS Configuration](#https-configuration)
6. [Content Security Policy](#content-security-policy)
7. [Verification Checklist](#verification-checklist)

---

## Security Headers

### Recommended Headers

All responses should include these security headers:

#### 1. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose:** Force HTTPS everywhere  
**Effect:** Browser will only access via HTTPS for 1 year  
**Caution:** Only enable after confirming HTTPS works everywhere

**Implementation (FastAPI):**
```python
from fastapi.middleware import CORSMiddleware

# In main application
app.add_middleware(
    "RawCORSMiddleware",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add HSTS middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class HSTSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(HSTSMiddleware)
```

---

#### 2. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevent MIME type sniffing  
**Effect:** Browser respects Content-Type header strictly  
**Implementation:**
```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
```

---

#### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose:** Prevent clickjacking attacks  
**Options:**
- `DENY` - Cannot be framed (most secure)
- `SAMEORIGIN` - Only same-origin can frame
- `ALLOW-FROM uri` - Specific origin only

**Implementation:**
```python
response.headers["X-Frame-Options"] = "DENY"
```

---

#### 4. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Enable browser XSS protection  
**Note:** Deprecated in modern browsers but good for older clients

**Implementation:**
```python
response.headers["X-XSS-Protection"] = "1; mode=block"
```

---

#### 5. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Control referrer header behavior  
**Options:**
- `no-referrer` - Never send referrer
- `strict-origin-when-cross-origin` - Only origin for cross-origin
- `same-origin` - Only for same-origin

**Implementation:**
```python
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
```

---

#### 6. Permissions-Policy (formerly Feature-Policy)

```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Purpose:** Restrict browser features access  
**Implementation:**
```python
response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
```

---

## Complete Security Middleware

```python
# backend/middleware/security_headers.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HSTS (only on production)
        if os.environ.get("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        
        # CSP (see separate section)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'"
        )
        
        return response

# In main.py
from backend.middleware.security_headers import SecurityHeadersMiddleware

app.add_middleware(SecurityHeadersMiddleware)
```

---

## CORS Configuration

### Secure CORS Settings

```python
from fastapi.middleware.cors import CORSMiddleware

# ONLY allow specific origins in production
allowed_origins = [
    "https://sms-app.example.com",      # Production frontend
    "https://admin.example.com",         # Admin panel
    # DO NOT include localhost or test URLs in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,      # Strict whitelist
    allow_credentials=True,              # Allow cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=3600,                        # 1 hour preflight cache
)
```

### Environment-Specific Configuration

```python
# backend/middleware/cors_config.py
import os

def get_allowed_origins():
    """Get CORS allowed origins based on environment."""
    env = os.environ.get("ENVIRONMENT", "development")
    
    if env == "production":
        return [
            "https://sms-app.example.com",
            "https://admin.example.com",
        ]
    elif env == "staging":
        return [
            "https://staging-sms.example.com",
            "https://staging-admin.example.com",
        ]
    else:  # development
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
```

---

## Rate Limiting

### Existing Implementation

The system already has rate limiting via `slowapi`:

```python
# backend/routers/auth.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/15 minutes")  # 5 attempts per 15 minutes
async def login(credentials: LoginRequest):
    # Login logic
    pass
```

### Recommended Enhancements

```python
# Rate limit by endpoint sensitivity
limiter.limit("10/minute")(public_endpoint)       # Generous
limiter.limit("5/15minutes")(login_endpoint)      # Restrictive
limiter.limit("1/minute")(password_reset)         # Very restrictive

# Custom limit key function (by user ID instead of IP)
def get_user_or_ip(request):
    if request.user:
        return f"user:{request.user.id}"
    return get_remote_address(request)

@router.post("/api/sensitive")
@limiter.limit("10/minute", key_func=get_user_or_ip)
async def sensitive_endpoint():
    pass
```

---

## Session Management

### Secure Session Configuration

```python
# backend/config.py

SESSION_CONFIG = {
    "lifetime": 24 * 60 * 60,  # 24 hours
    "secure": True,             # HTTPS only
    "httponly": True,           # No JavaScript access
    "samesite": "Strict",       # CSRF protection
    "domain": "sms-app.example.com",
    "path": "/",
}

# FastAPI JWT configuration
JWT_CONFIG = {
    "algorithm": "HS256",
    "expiration": 24 * 60 * 60,  # 24 hours
    "refresh_expiration": 7 * 24 * 60 * 60,  # 7 days
    "secret_key": os.environ["JWT_SECRET_KEY"],  # From env, not hardcoded
}
```

### Cookie Security

```python
from fastapi.responses import JSONResponse

def set_secure_cookie(response: JSONResponse, key: str, value: str, max_age: int = 86400):
    """Set a secure HTTP-only cookie."""
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        secure=True,           # HTTPS only
        httponly=True,         # No JS access
        samesite="strict",     # CSRF protection
        domain="sms-app.example.com",
        path="/",
    )
    return response
```

---

## HTTPS Configuration

### Enforcement

```python
# Only in production
if os.environ.get("ENVIRONMENT") == "production":
    # Add HTTPS redirect middleware
    from starlette.middleware.https import HTTPSMiddleware
    app.add_middleware(HTTPSMiddleware, enforce=True)
```

### Certificate Management

**Use modern, valid SSL certificates:**

```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Certificate expiration
openssl x509 -in /path/to/cert.pem -noout -enddate

# Common name check
openssl x509 -in /path/to/cert.pem -noout -subject
```

**Certificate SAN (Subject Alternative Names):**
- sms-app.example.com
- admin.example.com
- www.sms-app.example.com

---

## Content Security Policy (CSP)

### Strict CSP Policy

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.sms-app.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### Development vs Production

```python
def get_csp_header():
    env = os.environ.get("ENVIRONMENT", "development")
    
    if env == "production":
        # Strict policy
        return (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' https://fonts.googleapis.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    else:
        # Allow unsafe-inline for development
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "frame-ancestors 'self'"
        )
```

---

## Verification Checklist

### Before Deployment

- [ ] All security headers configured
- [ ] CORS whitelist verified (no localhost in production)
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] HTTPS enforcement enabled in production
- [ ] Session cookies: secure, httponly, samesite
- [ ] CSP policy tested in browser
- [ ] No console errors/warnings related to security
- [ ] Tested on production-like environment

### Testing

```bash
# Check response headers
curl -I https://api.sms-app.example.com/health

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...

# Check CORS
curl -H "Origin: https://external-site.com" -I https://api.sms-app.example.com

# Should NOT include CORS headers for external origin
```

### Browser Testing

1. **Check headers in DevTools:**
   - Open browser DevTools
   - Go to Network tab
   - Inspect Response Headers

2. **CSP violations:**
   - Check Console tab for CSP errors
   - Should see no violations if configured correctly

3. **HTTPS enforcement:**
   - Try accessing via HTTP
   - Should redirect to HTTPS

---

## Security Testing Tools

```bash
# Online security header checker
# https://securityheaders.com

# OWASP ZAP scan
# https://www.zaproxy.org/

# SSL/TLS checker
# https://www.ssllabs.com/ssltest/

# CORS checker
# https://www.test-cors.org/
```

---

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [MDN HTTP Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/secure-software-development-framework)

---

**Last Updated:** 2026-06-02  
**Status:** ACTIVE  
**Review Date:** 2026-09-02
