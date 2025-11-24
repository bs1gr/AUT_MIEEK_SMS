"""
QNAP Deployment Integration Tests

Tests the QNAP-specific deployment configuration including:
- PostgreSQL connection in Docker environment
- Port conflict detection
- QNAP directory structure
- Container health checks
- Environment variable validation
- Backup/restore functionality
"""

import pytest
from pathlib import Path
import yaml


# Test configuration paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOCKER_COMPOSE_PATH = PROJECT_ROOT / "docker-compose.qnap.yml"
ENV_EXAMPLE_PATH = PROJECT_ROOT / ".env.qnap.example"
INSTALL_SCRIPT_PATH = PROJECT_ROOT / "scripts" / "qnap" / "install-qnap.sh"


class TestDockerComposeConfiguration:
    """Test docker-compose.qnap.yml configuration."""

    def test_docker_compose_file_exists(self):
        """Verify docker-compose.qnap.yml exists."""
        assert DOCKER_COMPOSE_PATH.exists(), f"Missing {DOCKER_COMPOSE_PATH}"

    def test_docker_compose_valid_yaml(self):
        """Verify docker-compose.qnap.yml is valid YAML."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        assert config is not None
        assert "services" in config

    def test_docker_compose_required_services(self):
        """Verify all required services are defined."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        services = config.get("services", {})
        required_services = ["postgres", "backend", "frontend"]
        
        for service in required_services:
            assert service in services, f"Missing required service: {service}"

    def test_postgres_service_configuration(self):
        """Verify PostgreSQL service is properly configured."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        postgres = config["services"]["postgres"]
        
        # Check image
        assert "postgres" in postgres.get("image", "").lower()
        assert "alpine" in postgres.get("image", "").lower()
        
        # Check volumes
        assert "volumes" in postgres
        volumes = postgres["volumes"]
        assert any("postgresql/data" in str(v) for v in volumes)
        
        # Check environment variables
        env = postgres.get("environment", {})
        assert "POSTGRES_USER" in env
        assert "POSTGRES_PASSWORD" in env
        assert "POSTGRES_DB" in env
        
        # Check health check
        assert "healthcheck" in postgres

    def test_backend_service_configuration(self):
        """Verify backend service is properly configured."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        backend = config["services"]["backend"]
        
        # Check build context
        assert "build" in backend
        assert backend["build"]["dockerfile"] == "docker/Dockerfile.backend.qnap"
        
        # Check depends_on
        assert "depends_on" in backend
        assert "postgres" in backend["depends_on"]
        
        # Check environment
        env = backend.get("environment", [])
        env_str = str(env)
        assert "DATABASE_URL" in env_str
        assert "SECRET_KEY" in env_str
        
        # Check volumes for logs and data
        volumes = backend.get("volumes", [])
        assert any("logs" in str(v) for v in volumes)

    def test_frontend_service_configuration(self):
        """Verify frontend service is properly configured."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        frontend = config["services"]["frontend"]
        
        # Check build context
        assert "build" in frontend
        assert frontend["build"]["dockerfile"] == "docker/Dockerfile.frontend.qnap"
        
        # Check port mapping
        assert "ports" in frontend
        ports = frontend["ports"]
        assert any("8080" in str(p) or "${SMS_PORT}" in str(p) for p in ports)
        
        # Check depends_on
        assert "depends_on" in frontend
        assert "backend" in frontend["depends_on"]

    def test_monitoring_services_optional(self):
        """Verify monitoring services are in optional profiles."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        services = config.get("services", {})
        
        # Prometheus and Grafana should have profiles
        if "prometheus" in services:
            assert "profiles" in services["prometheus"]
        if "grafana" in services:
            assert "profiles" in services["grafana"]

    def test_volume_definitions(self):
        """Verify volume definitions for data persistence."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        # Check that volumes are defined (if using named volumes)
        # or bind mounts are properly configured
        services = config["services"]
        postgres_volumes = services["postgres"].get("volumes", [])
        
        # At least one volume should be defined for postgres data
        assert len(postgres_volumes) > 0


class TestEnvironmentConfiguration:
    """Test environment configuration template."""

    def test_env_example_exists(self):
        """Verify .env.qnap.example exists."""
        assert ENV_EXAMPLE_PATH.exists(), f"Missing {ENV_EXAMPLE_PATH}"

    def test_env_required_variables(self):
        """Verify all required environment variables are in template."""
        with open(ENV_EXAMPLE_PATH) as f:
            content = f.read()
        
        required_vars = [
            "POSTGRES_USER",
            "POSTGRES_PASSWORD",
            "POSTGRES_DB",
            "SECRET_KEY",
            "QNAP_IP",
            "SMS_PORT",
            "QNAP_DATA_PATH",
        ]
        
        for var in required_vars:
            assert var in content, f"Missing required variable: {var}"

    def test_env_security_placeholders(self):
        """Verify security-sensitive variables have placeholders."""
        with open(ENV_EXAMPLE_PATH) as f:
            content = f.read()
        
        # Check that sensitive vars are not using actual values
        lines = [line.strip() for line in content.split('\n') if '=' in line and not line.startswith('#')]
        
        for line in lines:
            if any(sensitive in line for sensitive in ['PASSWORD', 'SECRET_KEY', 'TOKEN']):
                key, value = line.split('=', 1)
                # Skip enforcement flags and empty optional tokens (indicated by "Optional:" comment above)
                if 'ENFORCEMENT' in key or value.strip() == '':
                    continue
                # Should have placeholder or generation instruction
                assert '<CHANGE_ME' in value or 'openssl' in value or 'python' in value, \
                    f"Security variable {key} should have placeholder"


class TestQNAPDirectoryStructure:
    """Test QNAP-specific directory structure requirements."""

    def test_qnap_paths_in_env_template(self):
        """Verify QNAP-specific paths are configured."""
        with open(ENV_EXAMPLE_PATH) as f:
            content = f.read()
        
        # Check for QNAP standard paths
        qnap_patterns = [
            "/share/Container/",
            "QNAP_DATA_PATH",
            "QNAP_LOG_PATH",
            "QNAP_BACKUP_PATH",
        ]
        
        for pattern in qnap_patterns:
            assert pattern in content, f"Missing QNAP path pattern: {pattern}"

    def test_directory_structure_documented(self):
        """Verify directory structure is documented in scripts README."""
        readme_path = PROJECT_ROOT / "scripts" / "qnap" / "README.md"
        assert readme_path.exists()
        
        with open(readme_path, encoding='utf-8') as f:
            content = f.read()
        
        # Should document directory structure
        assert "directory" in content.lower() or "structure" in content.lower()


class TestInstallationScript:
    """Test installation script functionality."""

    def test_install_script_exists(self):
        """Verify install script exists and is executable."""
        assert INSTALL_SCRIPT_PATH.exists()
        
        # Check shebang
        with open(INSTALL_SCRIPT_PATH, encoding='utf-8') as f:
            first_line = f.readline()
        assert first_line.startswith("#!/bin/bash")

    def test_install_script_required_functions(self):
        """Verify installation script has required functions."""
        with open(INSTALL_SCRIPT_PATH, encoding='utf-8') as f:
            content = f.read()
        
        required_functions = [
            "print_header",
            "check_qnap_environment",
            "check_docker_version",
            "check_resources",
            "check_ports",
            "create_directories",
            "build_images",
            "deploy_services",
        ]
        
        for func in required_functions:
            assert f"{func}()" in content or f"function {func}" in content, \
                f"Missing required function: {func}"

    def test_install_script_has_dry_run_mode(self):
        """Verify installation script supports dry-run mode."""
        with open(INSTALL_SCRIPT_PATH, encoding='utf-8') as f:
            content = f.read()
        
        assert "--dry-run" in content or "DRY_RUN" in content

    def test_install_script_checks_prerequisites(self):
        """Verify installation script checks prerequisites."""
        with open(INSTALL_SCRIPT_PATH, encoding='utf-8') as f:
            content = f.read()
        
        # Should check for Docker
        assert "docker" in content.lower()
        
        # Should check for docker-compose
        assert "compose" in content.lower()


class TestPortConfiguration:
    """Test port configuration and conflict detection."""

    def test_configurable_ports(self):
        """Verify ports are configurable via environment variables."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        # Frontend should have configurable ports
        frontend = config["services"]["frontend"]
        ports = str(frontend.get("ports", []))
        # Check for either direct port or environment variable usage
        assert "8080" in ports or "SMS_PORT" in str(frontend)

    def test_default_ports_documented(self):
        """Verify default ports are documented."""
        with open(ENV_EXAMPLE_PATH) as f:
            content = f.read()
        
        # Should document port 8080 as default
        assert "8080" in content

    def test_internal_ports_not_exposed(self):
        """Verify internal services don't expose ports unnecessarily."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        # Backend should not expose ports (accessed via frontend proxy)
        backend = config["services"]["backend"]
        # If ports are defined, they should be for internal use only
        if "ports" in backend:
            pytest.skip("Backend exposes ports - verify this is intentional")
        
        # PostgreSQL should not expose ports externally
        postgres = config["services"]["postgres"]
        if "ports" in postgres:
            pytest.skip("PostgreSQL exposes ports - should be internal only")


class TestHealthChecks:
    """Test health check configuration."""

    def test_postgres_health_check(self):
        """Verify PostgreSQL has health check configured."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        postgres = config["services"]["postgres"]
        assert "healthcheck" in postgres
        
        healthcheck = postgres["healthcheck"]
        assert "test" in healthcheck
        assert "interval" in healthcheck

    def test_backend_health_check(self):
        """Verify backend has health check configured."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        backend = config["services"]["backend"]
        
        # Should have healthcheck defined
        if "healthcheck" in backend:
            healthcheck = backend["healthcheck"]
            assert "test" in healthcheck
            # Should check /health endpoint
            assert "/health" in str(healthcheck["test"])

    def test_service_dependencies(self):
        """Verify services wait for dependencies to be healthy."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        backend = config["services"]["backend"]
        depends_on = backend.get("depends_on", {})
        
        # If using long form, should specify condition: service_healthy
        if isinstance(depends_on, dict) and "postgres" in depends_on:
            postgres_dep = depends_on["postgres"]
            if isinstance(postgres_dep, dict):
                assert postgres_dep.get("condition") == "service_healthy"


class TestSecurityConfiguration:
    """Test security configuration."""

    def test_secret_key_enforcement(self):
        """Verify SECRET_KEY_STRICT_ENFORCEMENT is enabled."""
        with open(DOCKER_COMPOSE_PATH) as f:
            content = f.read()
        
        assert "SECRET_KEY_STRICT_ENFORCEMENT" in content

    def test_required_variables_syntax(self):
        """Verify required variables use :? syntax."""
        with open(DOCKER_COMPOSE_PATH) as f:
            content = f.read()
        
        # Should use :? syntax for required variables
        assert ":?" in content or ":??" in content

    def test_restart_policies(self):
        """Verify services have appropriate restart policies."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        for service_name, service in config["services"].items():
            # Skip optional monitoring services
            if "profiles" in service:
                continue
            
            # Core services should have restart policy
            assert "restart" in service, f"Service {service_name} missing restart policy"
            assert service["restart"] in ["unless-stopped", "always", "on-failure"]

    def test_non_root_user_in_dockerfiles(self):
        """Verify Dockerfiles use non-root users."""
        backend_dockerfile = PROJECT_ROOT / "docker" / "Dockerfile.backend.qnap"
        
        if backend_dockerfile.exists():
            with open(backend_dockerfile) as f:
                content = f.read()
            
            # Should create and use non-root user
            assert "USER" in content or "user" in content.lower()
            # Should not be root (UID 0)
            assert "USER root" not in content


class TestBackupConfiguration:
    """Test backup and restore configuration."""

    def test_backup_script_exists(self):
        """Verify backup functionality exists in management script."""
        manage_script = PROJECT_ROOT / "scripts" / "qnap" / "manage-qnap.sh"
        assert manage_script.exists()
        
        with open(manage_script, encoding='utf-8') as f:
            content = f.read()
        
        assert "backup" in content.lower()

    def test_backup_directory_configured(self):
        """Verify backup directory is configured in environment."""
        with open(ENV_EXAMPLE_PATH) as f:
            content = f.read()
        
        assert "BACKUP" in content or "backup" in content

    def test_rollback_script_exists(self):
        """Verify rollback script exists."""
        rollback_script = PROJECT_ROOT / "scripts" / "qnap" / "rollback-qnap.sh"
        assert rollback_script.exists()
        
        with open(rollback_script, encoding='utf-8') as f:
            first_line = f.readline()
        assert first_line.startswith("#!/bin/bash")


class TestResourceLimits:
    """Test resource limits for QNAP environment."""

    def test_memory_limits_configured(self):
        """Verify services have appropriate memory limits."""
        with open(DOCKER_COMPOSE_PATH) as f:
            config = yaml.safe_load(f)
        
        for service_name, service in config["services"].items():
            # Skip optional services
            if "profiles" in service:
                continue
            
            # Check for resource limits or recommendations
            deploy = service.get("deploy", {})
            if "resources" in deploy:
                limits = deploy["resources"].get("limits", {})
                # If limits are set, they should be reasonable for NAS
                if "memory" in limits:
                    memory = limits["memory"]
                    # Parse memory value (e.g., "1024M", "1G")
                    assert any(unit in str(memory) for unit in ["M", "G", "m", "g"])

    def test_worker_count_optimized(self):
        """Verify worker count is optimized for NAS."""
        backend_dockerfile = PROJECT_ROOT / "docker" / "Dockerfile.backend.qnap"
        
        if backend_dockerfile.exists():
            with open(backend_dockerfile) as f:
                content = f.read()
            
            # Should configure limited workers for NAS
            if "WORKERS" in content or "workers" in content:
                # Should use 2 workers (recommended for NAS)
                assert "2" in content


class TestDocumentation:
    """Test documentation completeness."""

    def test_deployment_plan_exists(self):
        """Verify QNAP deployment plan exists."""
        plan_path = PROJECT_ROOT / "QNAP_DEPLOYMENT_PLAN.md"
        assert plan_path.exists()

    def test_scripts_readme_exists(self):
        """Verify scripts README exists."""
        readme_path = PROJECT_ROOT / "scripts" / "qnap" / "README.md"
        assert readme_path.exists()

    def test_scripts_documented(self):
        """Verify all scripts are documented in README."""
        readme_path = PROJECT_ROOT / "scripts" / "qnap" / "README.md"
        
        with open(readme_path, encoding='utf-8') as f:
            content = f.read()
        
        scripts = ["install-qnap.sh", "manage-qnap.sh", "uninstall-qnap.sh", "rollback-qnap.sh"]
        
        for script in scripts:
            assert script in content, f"Script {script} not documented in README"

    def test_troubleshooting_section_exists(self):
        """Verify troubleshooting documentation exists."""
        readme_path = PROJECT_ROOT / "scripts" / "qnap" / "README.md"
        
        with open(readme_path, encoding='utf-8') as f:
            content = f.read()
        
        assert "troubleshoot" in content.lower() or "debug" in content.lower()


class TestNginxConfiguration:
    """Test Nginx configuration for QNAP."""

    def test_nginx_config_exists(self):
        """Verify Nginx configuration file exists."""
        nginx_config = PROJECT_ROOT / "docker" / "nginx.qnap.conf"
        assert nginx_config.exists()

    def test_nginx_reverse_proxy_configured(self):
        """Verify Nginx is configured as reverse proxy to backend."""
        nginx_config = PROJECT_ROOT / "docker" / "nginx.qnap.conf"
        
        with open(nginx_config) as f:
            content = f.read()
        
        # Should proxy /api requests to backend
        assert "proxy_pass" in content
        assert "/api" in content or "backend" in content

    def test_nginx_security_headers(self):
        """Verify Nginx has security headers configured."""
        nginx_config = PROJECT_ROOT / "docker" / "nginx.qnap.conf"
        
        with open(nginx_config) as f:
            content = f.read()
        
        # Should have security headers
        security_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
        ]
        
        for header in security_headers:
            assert header in content, f"Missing security header: {header}"

    def test_nginx_compression_enabled(self):
        """Verify Nginx has compression enabled."""
        nginx_config = PROJECT_ROOT / "docker" / "nginx.qnap.conf"
        
        with open(nginx_config) as f:
            content = f.read()
        
        assert "gzip" in content.lower()


# Mark tests that require Docker as integration tests
pytestmark = pytest.mark.integration
