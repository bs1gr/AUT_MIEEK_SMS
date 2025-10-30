# Security Audit and Hardening Recommendations

**Version**: 3.0.3 (v1.1 branch)  
**Date**: 2025  
**Audit Scope**: Full-stack security assessment (frontend, backend, database, deployment)

---

## Executive Summary

This document provides a comprehensive security assessment of the Student Management System, identifying implemented protections, vulnerabilities, and actionable recommendations for production deployment.

**Overall Security Posture**: 🟡 **Development-Ready, Production-Needs-Hardening**

**Key Findings**:

- ✅ No hardcoded secrets in codebase
- ✅ CORS configuration via environment variables
- ✅ SQL injection protection via SQLAlchemy ORM
- ✅ Docker non-root user implementation (v1.1)
- ❌ **CRITICAL**: No authentication/authorization system
- ❌ **HIGH**: CORS allows development origins in production
- ❌ **HIGH**: No rate limiting on API endpoints
- ❌ **MEDIUM**: No input validation on file uploads
- ❌ **MEDIUM**: Error messages may expose internal details

---

## Authentication & Authorization

### Current State: ❌ **NOT IMPLEMENTED**

**Risk Level**: 🔴 **CRITICAL**

**Issues**:

1. All API endpoints are publicly accessible
2. No user authentication required for any operation
3. Admin operations (/adminops) accessible without authorization
4. No role-based access control (RBAC)
5. No session management

**Current API Interceptor** (commented out):

```javascript
// frontend/src/api/api.js
apiClient.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  }
);
```

### Recommended Implementation: JWT-Based Authentication

#### 1. Backend Dependencies

```bash
pip install PyJWT passlib[bcrypt]
```

#### 2. User Model Addition

```python
# backend/models.py
from sqlalchemy import Column, Integer, String, Boolean
from datetime import datetime, timezone

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
```

#### 3. Authentication Utilities

```python
# backend/auth.py
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")
    if username is None:
      raise credentials_exception
  except jwt.InvalidTokenError:
    raise credentials_exception
    
    user = session.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

async def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user
```

#### 4. Protected Endpoints Example

```python
# backend/routers/routers_students.py
from backend.auth import get_current_user, require_admin

@router.post("/", response_model=StudentResponse, status_code=201)
async def create_student(
    student: StudentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # Requires authentication
):
    # ... existing logic

@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin)  # Requires admin role
):
    # ... existing logic
```

#### 5. Frontend Integration

```typescript
// frontend/src/api/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Store token after login
export const login = async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login', { username, password });
  const { access_token } = response.data;
  localStorage.setItem('authToken', access_token);
  return response.data;
};

// Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

// Handle 401 responses (logout on auth failure)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## CORS Configuration

### Current State: ⚠️ **DEVELOPMENT-ONLY**

**Risk Level**: 🟠 **HIGH** (if deployed to production as-is)

**Current Configuration** (`backend/config.py`):

```python
CORS_ORIGINS: str = Field(
    default="http://localhost:5173,http://127.0.0.1:5173",
    description="Comma-separated list of allowed CORS origins"
)
```

**Issues**:

1. Allows development origins (localhost:5173) - **must not be used in production**
2. No origin validation beyond list matching
3. Wildcard `allow_methods=["*"]` and `allow_headers=["*"]` is overly permissive

**Current Middleware** (`backend/main.py`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],  # Too permissive
    allow_headers=["*"],  # Too permissive
)
```

### Recommended Production Configuration

#### 1. Environment-Based CORS

```python
# .env.production
CORS_ORIGINS=https://sms.example.com,https://www.sms.example.com
```

#### 2. Tightened Middleware

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Explicit methods
    allow_headers=["Content-Type", "Authorization"],  # Explicit headers
    max_age=600,  # Cache preflight for 10 minutes
)
```

#### 3. QNAP Deployment

For QNAP at `http://172.16.0.2:8080`:

```yaml
# docker-compose.qnap.yml
services:
  backend:
    environment:
      - CORS_ORIGINS=http://172.16.0.2:8080,http://localhost:8080
```

---

## Input Validation

### Current State: ⚠️ **PARTIAL**

**Risk Level**: 🟠 **MEDIUM**

#### ✅ Well-Protected Areas

1. **Pydantic Schemas**: All API inputs validated via Pydantic v2
   - Type checking (str, int, float, date, etc.)
   - Field constraints (min_length, max_length, ge, le)
   - Email validation via `email-validator`

   Example:
   ```python
   class StudentCreate(BaseModel):
       name: str = Field(..., min_length=1, max_length=200)
       email: EmailStr
       phone: str | None = Field(None, max_length=20)
       enrollment_date: date
   ```

2. **SQLAlchemy ORM**: Protects against SQL injection
   - Parameterized queries
   - No raw SQL execution observed

#### ❌ Missing Validation

1. **File Uploads** (Import endpoints):
   - No file size limits
   - No MIME type validation
   - No content scanning for malicious payloads
   - Excel/PDF parsing could be exploited

   **Recommendation**:
   ```python
   from fastapi import UploadFile, HTTPException
   
   MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
   ALLOWED_TYPES = {"application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
   
   async def validate_file(file: UploadFile):
       if file.content_type not in ALLOWED_TYPES:
           raise HTTPException(400, "Invalid file type")
       
       content = await file.read()
       if len(content) > MAX_FILE_SIZE:
           raise HTTPException(413, "File too large")
       
       await file.seek(0)  # Reset for processing
       return file
   ```

2. **Pagination Parameters**:
   - ✅ Fixed in v1.1: `skip < 0` now returns 400
   - ✅ Limit capped at `settings.MAX_PAGE_SIZE`
   - Remaining issue: Very large `skip` values could cause performance issues

3. **Date Ranges**:
   - No validation that `start_date < end_date` in filters
   - Could result in empty queries or unexpected behavior

---

## Secrets Management

### Current State: ⚠️ **PARTIAL**

**Risk Level**: 🟠 **MEDIUM**

#### ✅ Good Practices

1. No hardcoded secrets in codebase
2. Environment variables used for configuration
3. `.env` not committed to git (assumed via `.gitignore`)

#### ❌ Issues

1. **No `.env.example` validation**:
   - Created in v1.1, but no enforcement of required variables
   - Missing variables fail silently or use unsafe defaults

2. **JWT Secret Key** (if auth implemented):
   - Must be strong, random, and environment-specific
   - **Bad**: `SECRET_KEY = "my_secret_key"`
   - **Good**: `SECRET_KEY = os.getenv("JWT_SECRET_KEY")` with validation

3. **Database Credentials**:
   - SQLite has no credentials (file-based)
   - Postgres (production) needs secure credential management

### Recommended: Secrets Validation on Startup

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing fields
    
    JWT_SECRET_KEY: str = Field(
        ...,  # Required field
        min_length=32,
        description="JWT signing key (use openssl rand -hex 32)"
    )
    
    @validator('JWT_SECRET_KEY')
    def validate_jwt_secret(cls, v):
        if v in ['change_me', 'secret', 'dev_secret']:
            raise ValueError("Insecure JWT secret detected. Generate with: openssl rand -hex 32")
        return v

settings = Settings()
```

**Generate Secure Key**:

```bash
openssl rand -hex 32
# Output: f8e2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
```

---

## Rate Limiting

### Current State: ❌ **NOT IMPLEMENTED**

**Risk Level**: 🟠 **HIGH**

**Risks**:

1. **Brute-force attacks** on auth endpoints (once implemented)
2. **Denial of Service (DoS)** via excessive requests
3. **Data scraping** of student/course information
4. **Resource exhaustion** on expensive operations (exports, analytics)

### Recommended: SlowAPI Integration

```bash
pip install slowapi
```

```python
# backend/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to specific endpoints
@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(request: Request, ...):
    ...

@app.get("/api/v1/students/")
@limiter.limit("60/minute")  # 60 requests per minute for list endpoints
async def list_students(request: Request, ...):
    ...

@app.post("/api/v1/exports/")
@limiter.limit("10/hour")  # Expensive operations limited more strictly
async def export_data(request: Request, ...):
    ...
```

**Alternative**: Use NGINX rate limiting for container deployments:

```nginx
# docker/nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend:8000;
        }
    }
}
```

---

## Error Handling & Information Disclosure

### Current State: ⚠️ **PARTIAL**

**Risk Level**: 🟠 **MEDIUM**

#### ⚠️ Potential Information Leaks

1. **Database Errors**:
   - SQLAlchemy exceptions may expose table/column names
   - Example: `IntegrityError` reveals constraint names

2. **File Paths**:
   - Admin operations return absolute paths:
     ```python
     return {"backup_path": str(backup_path)}
     ```

3. **Stack Traces** (if `DEBUG=True` in production):
   - FastAPI's debug mode exposes full tracebacks

#### Recommended Error Sanitization

```python
# backend/main.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database integrity error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Data integrity constraint violated. Check for duplicates or missing references."}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."}
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred."}
    )
```

#### Production Settings

```python
# backend/config.py
DEBUG: bool = Field(default=False, description="Debug mode (NEVER enable in production)")

# backend/main.py
app = FastAPI(
    title="Student Management System API",
    version="3.0.3",
    debug=settings.DEBUG,  # Should be False in production
    docs_url="/docs" if settings.DEBUG else None,  # Disable Swagger UI in production
    redoc_url="/redoc" if settings.DEBUG else None
)
```

---

## Logging & Monitoring

### Current State: ✅ **IMPLEMENTED (Structured Logging)**

**Risk Level**: 🟢 **LOW**

**Strengths**:

1. Structured JSON logging (`backend/logs/structured.json`)
2. Centralized logger configuration (`backend/logging_config.py`)
3. HTTP request logging via middleware

#### ⚠️ Security Concerns

1. **Sensitive Data in Logs**:
   - Ensure passwords, tokens, and PII are not logged
   - Example: Log `username` but not `password` in login attempts

2. **Log Injection**:
   - User inputs in logs must be sanitized
   - Example: Username `admin\n{"level":"CRITICAL"}` could forge log entries

**Recommendation**:

```python
# backend/logging_config.py
import re

def sanitize_log_input(value: str) -> str:
    """Remove newlines and control characters to prevent log injection."""
    return re.sub(r'[\r\n\t]', '', value)

# Usage
logger.info(f"Login attempt for user: {sanitize_log_input(username)}")
```

---

## Docker Security

### Current State: ✅ **HARDENED (v1.1)**

**Risk Level**: 🟢 **LOW**

**Improvements Made**:

1. ✅ Non-root user (`appuser`) in Dockerfiles
2. ✅ Healthchecks on `/health` endpoint
3. ✅ `pip upgrade` before package installation
4. ✅ Restart policies (`unless-stopped`) in QNAP compose

#### Additional Recommendations

1. **Image Scanning**:
   - Use `docker scan` or Trivy to detect vulnerabilities:
     ```bash
     docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image sms-backend:latest
     ```

2. **Read-Only Root Filesystem**:
   ```yaml
   services:
     backend:
       read_only: true
       tmpfs:
         - /tmp
   ```

3. **Drop Capabilities**:
   ```yaml
   services:
     backend:
       cap_drop:
         - ALL
       cap_add:
         - NET_BIND_SERVICE  # Only if binding to port <1024
   ```

4. **Secrets Management**:
   - Use Docker secrets instead of environment variables:
     ```yaml
     services:
       backend:
         secrets:
           - db_password
     secrets:
       db_password:
         external: true
     ```

---

## HTTPS/TLS

### Current State: ❌ **NOT CONFIGURED**

**Risk Level**: 🔴 **CRITICAL** (for production over public networks)

**Issues**:

1. All traffic unencrypted (HTTP only)
2. Credentials transmitted in plaintext (once auth is added)
3. Vulnerable to man-in-the-middle (MITM) attacks

### Recommended: Reverse Proxy with TLS

#### Option 1: NGINX with Let's Encrypt

```nginx
# docker/nginx-ssl.conf
server {
    listen 443 ssl http2;
    server_name sms.example.com;

    ssl_certificate /etc/letsencrypt/live/sms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sms.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name sms.example.com;
    return 301 https://$server_name$request_uri;
}
```

#### Option 2: Traefik with Automatic HTTPS

```yaml
# docker-compose.traefik.yml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`sms.example.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=myresolver"
```

---

## Compliance & Privacy

### GDPR Considerations (if applicable)

1. **Data Retention**:
   - Implement data deletion policies
   - Add "right to be forgotten" endpoints

2. **Audit Logging**:
   - Log all access to student PII
   - Implement audit trail for data modifications

3. **Consent Management**:
   - Track consent for data processing
   - Add privacy policy acceptance workflow

### Recommended Additions

```python
# backend/models.py
class DataAccessLog(Base):
    __tablename__ = 'data_access_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    resource_type = Column(String)  # 'student', 'grade', etc.
    resource_id = Column(Integer)
    action = Column(String)  # 'view', 'edit', 'delete'
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String)
```

---

## Security Checklist for Production Deployment

### Pre-Deployment

- [ ] Implement JWT authentication system
- [ ] Tighten CORS to production origins only
- [ ] Add rate limiting to all endpoints
- [ ] Enable HTTPS/TLS with valid certificates
- [ ] Validate all file uploads (type, size, content)
- [ ] Sanitize error messages (no stack traces)
- [ ] Disable Swagger UI (`/docs`) and ReDoc (`/redoc`) in production
- [ ] Set `DEBUG=False` in backend
- [ ] Generate strong JWT secret key (`openssl rand -hex 32`)
- [ ] Review and redact sensitive data in logs
- [ ] Implement input validation for date ranges and pagination
- [ ] Add security headers (CSP, HSTS, X-Frame-Options)

### Post-Deployment

- [ ] Set up log aggregation (ELK stack, Splunk, or CloudWatch)
- [ ] Configure automated backups with encryption
- [ ] Enable intrusion detection (fail2ban, Wazuh)
- [ ] Schedule regular dependency updates (`pip-audit`, `npm audit`)
- [ ] Conduct penetration testing
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Create incident response plan
- [ ] Document security contact information

### Ongoing Maintenance

- [ ] Monthly dependency vulnerability scans
- [ ] Quarterly security audits
- [ ] Annual penetration testing
- [ ] Review access logs for anomalies
- [ ] Update TLS certificates before expiration
- [ ] Rotate JWT secret keys annually

---

## Recommended Security Headers

Add via middleware or reverse proxy:

```python
# backend/main.py
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# Force HTTPS in production
if not settings.DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)

# Restrict allowed hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["sms.example.com", "www.sms.example.com"]
)

# Security headers via custom middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

## Vulnerability Disclosure

**Contact**: [security@example.com](mailto:security@example.com)
**PGP Key**: [Public key](https://example.com/pgp.asc)
**Response Time**: 48 hours for initial acknowledgment

**Reporting Guidelines**:

1. Email security contact with detailed description
2. Include steps to reproduce
3. Allow 90 days for fix before public disclosure
4. Do not exploit vulnerabilities on production systems

---

## Conclusion

This system has a solid foundation for development but **requires significant security hardening before production deployment**. Priority should be given to:

1. **Authentication/Authorization** - Critical for production
2. **HTTPS/TLS** - Required for secure communications
3. **Rate Limiting** - Prevents abuse and DoS
4. **CORS Hardening** - Restricts access to production origins
5. **Input Validation** - Prevents injection and malicious uploads

The v1.1 branch improvements (Docker hardening, CI workflow, environment template) provide a good starting point. Focus on implementing authentication first, followed by TLS and rate limiting.

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Next Review**: After authentication implementation  
**Prepared By**: GitHub Copilot (AI Security Assessment)
