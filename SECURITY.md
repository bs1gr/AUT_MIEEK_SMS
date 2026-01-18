# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the AUT_MIEEK_SMS project, please report it responsibly by emailing **bs1gr@yahoo.com** instead of using the public issue tracker.

### Vulnerability Report Details

Please include the following information in your report:

- **Description**: Clear explanation of the vulnerability
- **Location**: File path(s) and line numbers (if applicable)
- **Steps to Reproduce**: Detailed steps to demonstrate the issue
- **Potential Impact**: What an attacker could do with this vulnerability
- **Suggested Fix**: Any recommendations you have (optional but helpful)
- **Your Contact**: Your email or preferred contact method

### Response Timeline

We commit to the following response times:

- **Acknowledgment**: Within 48 hours of receipt
- **Initial Assessment**: Within 1 week
- **Fix & Patch**: Depends on severity
  - **Critical**: 24-72 hours
  - **High**: 1-2 weeks
  - **Medium**: 2-4 weeks
  - **Low**: Next scheduled release

---

## Supported Versions

Security updates and patches are provided for:

| Version | Status | Support |
|---------|--------|---------|
| v1.x.x (latest) | ✅ Supported | Active security updates |
| v1.17.x | ✅ Supported | Patch releases |
| Earlier versions | ⚠️ Limited | Critical fixes only |

---

## Security Practices

This project implements comprehensive security controls:

### Static Analysis & Scanning

- **Gitleaks**: Detects secrets in code (pre-commit hooks + CI/CD)
- **detect-secrets**: Baseline secret detection with validation
- **GitHub Security Scanning**: Backend, Frontend, and Docker image scans
- **ESLint**: TypeScript security rules + best practices enforcement
- **Bandit**: Python security linting in CI/CD
- **npm audit**: JavaScript dependency vulnerability scanning
- **Docker Scan**: Container image security analysis

### Authentication & Authorization

- **JWT-based Authentication**: Stateless token-based auth system
- **Role-Based Access Control (RBAC)**: Fine-grained permission system (26 permissions across 8 domains)
- **Multi-layer Authorization**: Endpoint-level permission checks via `@require_permission` decorators
- **AUTH_MODE Enforcement**: Permissive, strict, and disabled modes for flexible deployment

### Data Protection

- **Encryption at Rest**: AES-256-GCM for encrypted backups
- **HTTPS/TLS**: Required for all production deployments
- **Soft Deletes**: Data never permanently deleted without explicit recovery procedures
- **Environment Variables**: Secrets managed via .gitignored `.env` files
- **SECRET_KEY Validation**: 4-layer enforcement (Docker, backend, CI/CD, runtime)

### Code Quality & Testing

- **Pre-commit Hooks**: Validation before every commit
  - Format checking (Prettier)
  - Linting (ESLint, Ruff, MyPy)
  - Type checking (TypeScript strict mode)
  - Secret scanning (Gitleaks)

- **Comprehensive Testing**: CI/CD runs
  - Backend: 370+ unit & integration tests
  - Frontend: 1,249+ component & hook tests
  - E2E: 19+ critical path tests
  - Load Testing: Performance baselines & regression detection

### Database Security

- **Alembic Migrations**: Version-controlled schema changes only
- **SQLAlchemy ORM**: Prevents SQL injection via parameterized queries
- **Connection Pooling**: Secure database connection management
- **Audit Logging**: Tracks all sensitive data changes

### API Security

- **Rate Limiting**: Configurable per-endpoint limits (default: 10/min write, 60/min read)
- **CSRF Protection**: CSRF tokens enabled in production
- **Error Handling**: Secure error messages (no sensitive details leaked)
- **Input Validation**: Pydantic schemas for all API inputs
- **Response Standardization**: RFC 7807 problem-detail error responses

### Dependency Management

- **Automated Updates**: Dependabot scans for vulnerable dependencies
- **Pinned Versions**: Reproducible builds with locked versions
- **Regular Audits**: Monthly security updates and audits
- **Transitive Dependency Scanning**: Checks indirect dependencies

### Deployment Security

- **Docker Security**: Multi-stage builds, non-root containers, image scanning
- **Environment Isolation**: Separate dev/staging/production configurations
- **Secrets Management**: Production secrets stored securely, never in version control
- **Health Checks**: Container health monitoring and restart policies

---

## Security Contacts

- **Primary Contact**: bs1gr@yahoo.com
- **GitHub Security Advisory**: Use the [advisory form](https://github.com/bs1gr/AUT_MIEEK_SMS/security/advisories/new)

---

## Disclosure Policy

We follow responsible disclosure practices:

1. **Do Not** publicly disclose vulnerabilities before a fix is available
2. **Do** provide at least 30 days notice before public disclosure
3. **Do** credit responsible researchers (with permission)
4. **Do** communicate regularly with security researchers about fix progress

---

## Security Disclaimers

### Production Deployment

This application requires proper security hardening before production deployment:

- [ ] Set strong `SECRET_KEY` (86+ characters, cryptographically random)
- [ ] Configure `AUTH_MODE=permissive` or `strict` (never `disabled` in production)
- [ ] Enable HTTPS/TLS with valid SSL certificates
- [ ] Set up automated backups with encryption
- [ ] Configure rate limiting appropriate for your workload
- [ ] Enable audit logging and monitoring
- [ ] Run security scans before deployment
- [ ] Keep dependencies updated regularly

### Known Limitations

- This is a bilingual (EN/EL) educational management system
- Designed for institutional deployments, not large-scale public use
- Requires proper system administration and security hardening
- Regular updates and monitoring recommended

---

## Changelog

### v1.17.2 (January 14, 2026)

- ✅ Fixed 17 security vulnerabilities (path traversal, input validation)
- ✅ Enhanced RBAC permission system (26 permissions, 79 endpoints)
- ✅ Completed security scanning infrastructure
- ✅ Added Secret Management Strategy documentation

### v1.15.0 (January 5, 2026)

- ✅ Implemented audit logging for all sensitive operations
- ✅ Enhanced error messages (user-friendly, no sensitive details)
- ✅ API response standardization with RFC 7807 compliance
- ✅ Backup encryption with AES-256-GCM

### v1.14.0+ (Late 2025)

- ✅ Gitleaks integration for secret scanning
- ✅ Security headers middleware
- ✅ Rate limiting system
- ✅ RBAC foundation implementation

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

**Last Updated**: January 18, 2026

**Policy Version**: 1.0

For questions or clarifications, please contact: **bs1gr@yahoo.com**
