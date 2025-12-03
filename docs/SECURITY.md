# Security Guidelines

## 🔐 Critical Security Requirements

This document outlines mandatory security practices for deploying the Student Management System.

## 1. SECRET_KEY Configuration

### What is SECRET_KEY?

The `SECRET_KEY` is used to cryptographically sign JWT authentication tokens and sessions. A weak or default key allows attackers to:

- Forge valid authentication tokens
- Impersonate any user (including administrators)
- Completely bypass authentication

### Requirements

- **Minimum Length:** 32 characters (48+ recommended)
- **Randomness:** Must be cryptographically random
- **Uniqueness:** Each deployment must have a unique key

### Generating a Secure Key

```bash
# Recommended: 48-byte (64-character) key
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Minimum: 32-byte (43-character) key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Setting SECRET_KEY

#### Docker Deployment

1. Edit `.env` file in project root:

   ```dotenv
   SECRET_KEY=<your-generated-key-here>
   ```

2. **CRITICAL:** Docker compose will **fail to start** if SECRET_KEY is not set or is weak
3. Validation happens automatically during `DOCKER.ps1 -Start`

#### Native Deployment

1. Edit `backend/.env`:

   ```dotenv
   SECRET_KEY=<your-generated-key-here>
   ```

2. Validation occurs on application startup when `AUTH_ENABLED=True`

### Automatic Protection

The system includes multiple layers of protection:

1. **Docker Compose:** No default fallback - requires explicit SECRET_KEY
2. **Startup Validation:** DOCKER.ps1 validates key before container start
3. **Backend Validation:** config.py rejects weak/placeholder keys when AUTH_ENABLED
4. **CI/Test Mode:** Auto-generates temporary secure keys

### Insecure Patterns (Rejected)

The following patterns are automatically detected and rejected:

- Contains "change", "placeholder", "example", "your-secret"
- Less than 32 characters
- Default Docker compose fallback (removed in v1.9.3)
- Empty or whitespace-only values

## 2. Admin Credentials

### Default Credentials (INSECURE)

After installation, the system creates a default admin account:

- **Email:** `admin@example.com`
- **Password:** `YourSecurePassword123!`

**⚠️ WARNING:** These credentials are publicly documented and MUST be changed immediately.

### Secure Admin Setup

#### Method 1: Pre-Deployment (Recommended for Production)

Edit `backend/.env` **before first startup**:

```dotenv
DEFAULT_ADMIN_EMAIL=your.email@company.com
DEFAULT_ADMIN_PASSWORD=<secure-generated-password>
```

Generate secure password:

```bash
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

#### Method 2: Post-Deployment (Development/Testing)

1. Start the application
2. Login with default credentials
3. **Immediately** navigate to Control Panel → Maintenance
4. Use "Change Your Password" section (top teal card)
5. Set a strong unique password

### Password Requirements

- Minimum 8 characters (enforced by backend)
- Recommended: 24+ character random string
- Never reuse passwords from other systems
- Store securely (password manager recommended)

## 3. SQL Injection Protection

### Current Status: ✅ SECURE

The system is protected against SQL injection through:

1. **SQLAlchemy ORM:** All queries use parameterized statements
2. **Pydantic Validation:** Input sanitization before database access
3. **Performance Monitor:** Logs sanitized via `repr()` encoding
4. **No Raw SQL:** No dynamic SQL string construction

### Verification

The `performance_monitor.py` module safely serializes SQL parameters for logging using Python's built-in `repr()` function, which:

- Escapes all special characters
- Prevents code injection in logs
- Never executes logged parameters as SQL

**Code Location:** `backend/performance_monitor.py` line 21-42

## 4. Authentication Modes

### AUTH_ENABLED

Controls whether JWT authentication is required:

- `True` (recommended): All endpoints require valid JWT token
- `False` (legacy): Public access, no authentication

### AUTH_MODE

Fine-tunes authorization behavior when `AUTH_ENABLED=True`:

- `disabled`: No auth checks (equivalent to AUTH_ENABLED=False)
- `permissive` (recommended): Auth required, all authenticated users can access
- `strict`: Full role-based access control (admin/teacher/student)

### Production Recommendation

```dotenv
AUTH_ENABLED=True
AUTH_MODE=permissive
SECRET_KEY_STRICT_ENFORCEMENT=True
```

## 5. Rate Limiting

All API endpoints are protected by rate limiting:

```dotenv
RATE_LIMIT_ENABLED=True
RATE_LIMIT_READ_PER_MINUTE=1000
RATE_LIMIT_WRITE_PER_MINUTE=600
RATE_LIMIT_HEAVY_PER_MINUTE=200
RATE_LIMIT_AUTH_PER_MINUTE=50
```

This prevents:

- Brute force authentication attacks
- API abuse
- Denial of service attacks

## 6. CSRF Protection

Cross-Site Request Forgery protection can be enabled:

```dotenv
CSRF_ENABLED=True
CSRF_COOKIE_SAMESITE=lax
CSRF_COOKIE_SECURE=True  # For HTTPS only
```

**Note:** CSRF is disabled in test mode for compatibility with TestClient.

## 7. CORS Configuration

Control which origins can access the API:

```dotenv
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

For production:

```dotenv
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Never use:** `CORS_ORIGINS=*` in production

## 8. Database Security

### Path Traversal Protection

The system validates database paths to prevent traversal attacks:

- SQLite: Must be within project directory or `/data` (Docker)
- PostgreSQL: Connection string validated during startup
- Automatic validation in `config.py`

### Backup Security

Database backups are stored with checksums:

```
sms_backup_20251203_143022_a1b2c3d4.db
                                ^^^^^^^^ SHA-256 hash (first 8 chars)
```

This ensures backup integrity and prevents tampering.

## 9. Docker Security

### Image Security

- Minimal base images (Python slim)
- Regular dependency updates
- `pip-audit` scanning in CI/CD
- No root user in containers

### Volume Security

- Named volumes for data persistence
- Read-only mounts for templates
- Volume version tracking prevents corruption

### Network Security

- No exposed ports except application port
- Internal network for multi-container setups
- Health checks prevent zombie containers

## 10. Monitoring & Logging

### Security Event Logging

All authentication events are logged:

- Login attempts (success/failure)
- Account lockouts
- Token generation/refresh
- Admin actions

**Location:** `backend/logs/app.log` and `structured.json`

### Metrics Endpoint

The `/metrics` endpoint (Prometheus format) is **disabled by default**:

```dotenv
ENABLE_METRICS=0  # Default: disabled
```

Only enable for trusted monitoring infrastructure.

## 11. Dependency Security

### Automated Scanning

- `pip-audit` runs in CI/CD pipeline
- Vulnerability reports in `backend/pip-audit-report.json`
- Automated dependency updates via Dependabot

### Manual Updates

```bash
cd backend
pip-audit --fix
pip install --upgrade -r requirements.txt
```

## 12. Security Checklist for Production

Before deploying to production, verify:

- [ ] **SECRET_KEY** is unique and 48+ characters
- [ ] **Admin credentials** changed from defaults
- [ ] `AUTH_ENABLED=True` and `AUTH_MODE=permissive` or `strict`
- [ ] `SECRET_KEY_STRICT_ENFORCEMENT=True`
- [ ] CORS origins restricted to your domain(s)
- [ ] HTTPS/TLS enabled (reverse proxy)
- [ ] Database backups configured and tested
- [ ] All dependencies updated to latest secure versions
- [ ] Monitoring/alerting configured
- [ ] Security headers enabled (automatic)
- [ ] Rate limiting enabled
- [ ] Regular security audit schedule established

## 13. Incident Response

### If SECRET_KEY is Compromised

1. **Immediately generate new key:**

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. **Update .env file**
3. **Restart application** (invalidates all existing tokens)
4. **Force all users to re-login**
5. **Review logs for suspicious activity**
6. **Consider rotating admin passwords**

### If Admin Account is Compromised

1. **Disable account via Control Panel → User Management**
2. **Create new admin account** with different email
3. **Review audit logs** for unauthorized actions
4. **Check for data exfiltration** (session exports, backups)
5. **Rotate SECRET_KEY** as precaution

## 14. Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **Email:** Contact via GitHub Security Advisory (preferred) or maintainer email
3. **Include:**
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

We will acknowledge within 48 hours and provide a timeline for fix.

## 15. Security Resources

### Internal Documentation

- [AUTHENTICATION.md](development/AUTHENTICATION.md) - Auth implementation details
- [DOCKER_NAMING_CONVENTIONS.md](operations/DOCKER_NAMING_CONVENTIONS.md) - Volume security
- [ARCHITECTURE.md](development/ARCHITECTURE.md) - System security architecture

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [SQLAlchemy Security](https://docs.sqlalchemy.org/en/14/faq/security.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

## Version History

- **v1.9.3** (2025-12-03): Removed SECRET_KEY default in docker-compose.yml, hardened .env.example, added startup validation
- **v1.9.0** (2025-11): Added SECRET_KEY_STRICT_ENFORCEMENT, CSRF protection
- **v1.8.0** (2025-10): Implemented JWT authentication, role-based access control


