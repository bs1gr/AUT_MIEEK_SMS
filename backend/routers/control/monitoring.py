from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urljoin

from fastapi import APIRouter, HTTPException, Request
from httpx import HTTPError

from backend.config import get_settings
from backend.errors import ErrorCode, http_error
from backend.import_resolver import import_names

from .common import (
    check_docker_running,
    docker_compose,
    in_docker_container,
)

(limiter, RATE_LIMIT_HEAVY, RATE_LIMIT_READ) = import_names(
    "rate_limiting", "limiter", "RATE_LIMIT_HEAVY", "RATE_LIMIT_READ"
)

router = APIRouter()


@router.get("/monitoring/environment")
async def get_monitoring_environment(request: Request):
    in_container = in_docker_container()
    docker_running = check_docker_running()
    return {
        "in_container": in_container,
        "docker_available": docker_running,
        "can_control_monitoring": not in_container and docker_running,
        "monitoring_control_message": (
            "Use DOCKER.ps1 -WithMonitoring from host"
            if in_container
            else "Monitoring can be controlled from this interface"
            if docker_running
            else "Docker is not available"
        ),
    }


@router.get("/monitoring/status")
async def get_monitoring_status(request: Request):
    import logging

    logger = logging.getLogger(__name__)
    logger.info("Monitoring status check requested")

    in_container = in_docker_container()
    docker_available = check_docker_running()

    # Prepare default service URLs from settings (they adapt for container vs native)
    settings = get_settings()

    def with_public_url(url: str, port: int) -> Dict[str, Any]:
        from urllib.parse import urlparse, urlunparse

        parsed = urlparse(url)
        public_netloc = parsed.netloc
        # For browser use: prefer localhost when service hostname is host.docker.internal
        if parsed.hostname and parsed.hostname.lower() == "host.docker.internal":
            public_netloc = f"localhost:{port}"
        public_url = urlunparse(
            (parsed.scheme, public_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
        )
        return {"running": False, "url": url, "url_public": public_url, "port": port}

    services_status: Dict[str, Dict[str, Any]] = {
        "grafana": with_public_url(settings.GRAFANA_URL, 3000),
        "prometheus": with_public_url(settings.PROMETHEUS_URL, 9090),
        "loki": with_public_url(settings.LOKI_URL, 3100),
    }

    # If Docker is not available on host and we're not inside container → monitoring control unavailable
    if not docker_available and not in_container:
        return {
            "available": False,
            "in_container": in_container,
            "can_control": False,
            "message": "Docker is not running",
            "services": services_status,
        }

    # If running inside container and Docker CLI is not available, we can still try probing services directly
    # using URLs that point to host.docker.internal. This allows correct 'running' detection.
    if in_container and not docker_available:
        try:
            import httpx  # local import to keep import surface small

            async with httpx.AsyncClient(timeout=1.5) as client:
                # Grafana: prefer /api/health endpoint
                try:
                    base = services_status["grafana"]["url"].rstrip("/") + "/"
                    health = await client.get(urljoin(base, "api/health"))
                    services_status["grafana"]["running"] = health.status_code == 200
                except Exception:
                    services_status["grafana"]["running"] = False

                # Prometheus: root returns 200 when up
                try:
                    r = await client.get(services_status["prometheus"]["url"], follow_redirects=True)
                    services_status["prometheus"]["running"] = r.status_code == 200
                except Exception:
                    services_status["prometheus"]["running"] = False

                # Loki: /ready or /metrics
                try:
                    base = services_status["loki"]["url"].rstrip("/") + "/"
                    r = await client.get(urljoin(base, "ready"))
                    services_status["loki"]["running"] = r.status_code == 200
                except Exception:
                    services_status["loki"]["running"] = False

        except Exception:
            # Ignore probing errors; we'll fall back to 'not running'
            pass

        any_running = any(s["running"] for s in services_status.values())
        return {
            "available": True,
            "in_container": in_container,
            "can_control": True,
            "running": any_running,
            "message": "Container mode: status detected via HTTP probes.",
            "services": services_status,
        }

    monitoring_compose = Path("docker-compose.monitoring.yml")
    if not monitoring_compose.exists():
        return {
            "available": False,
            "in_container": in_container,
            "can_control": not in_container,
            "message": "Monitoring compose file not found",
            "services": {},
        }

    success, stdout, stderr = docker_compose(["ps", "--services", "--filter", "status=running"], timeout=10)
    if success:
        running_services = stdout.strip().split("\n") if stdout.strip() else []
        for service in running_services:
            if service in services_status:
                services_status[service]["running"] = True
    any_running = any(s["running"] for s in services_status.values())
    return {
        "available": True,
        "in_container": in_container,
        "can_control": True,
        "running": any_running,
        "services": services_status,
        "compose_file": str(monitoring_compose.absolute()),
    }


@router.post("/monitoring/trigger")
@limiter.limit(RATE_LIMIT_HEAVY)
async def trigger_monitoring_from_container(request: Request):
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Monitoring trigger requested from container",
        extra={"action": "monitoring_trigger_requested", "request_id": getattr(request.state, "request_id", None)},
    )
    if not in_docker_container():
        return await start_monitoring_stack(request)

    trigger_dir = Path("/app/data/.triggers")
    trigger_file = trigger_dir / "start_monitoring.ps1"
    try:
        trigger_dir.mkdir(parents=True, exist_ok=True)
        script_content = """# Auto-generated monitoring trigger
$ErrorActionPreference = "Stop"

Write-Host "Starting monitoring stack from trigger..."

try {
    $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $projectRoot
    Write-Host "Project root: $projectRoot"
    docker compose -f docker-compose.monitoring.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Monitoring stack started successfully"
        Remove-Item $PSCommandPath -Force
    } else {
        Write-Host "❌ Failed to start monitoring stack (exit code: $LASTEXITCODE)"
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_"
    exit 1
}
"""
        trigger_file.write_text(script_content, encoding="utf-8")
        logger.info(
            "Monitoring trigger script created",
            extra={
                "action": "monitoring_trigger_created",
                "trigger_file": str(trigger_file),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return {
            "success": True,
            "message": "Monitoring trigger created. Execute the script on your host to start monitoring.",
            "details": {
                "trigger_file": str(trigger_file).replace("/data", "data"),
                "instructions": [
                    "Option 1: Run the trigger script: pwsh data/.triggers/start_monitoring.ps1",
                    "Option 2: Run directly: docker compose -f docker-compose.monitoring.yml up -d",
                    "Option 3: Use helper: .\\DOCKER.ps1 -WithMonitoring",
                ],
                "mode": "container_trigger",
            },
        }
    except Exception as e:
        logger.error(f"Failed to create trigger script: {e}")
        raise http_error(
            500, ErrorCode.CONTROL_OPERATION_FAILED, f"Failed to create monitoring trigger: {str(e)}", request
        )


@router.post("/monitoring/start")
@limiter.limit(RATE_LIMIT_HEAVY)
async def start_monitoring_stack(request: Request):
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Monitoring stack start requested",
        extra={
            "action": "monitoring_start_requested",
            "request_id": getattr(request.state, "request_id", None),
            "client_host": request.client.host if request.client else None,
        },
    )
    if in_docker_container():
        trigger_file = Path("/data/monitoring_start.trigger")
        try:
            trigger_file.parent.mkdir(parents=True, exist_ok=True)
            trigger_file.write_text(
                json.dumps(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "request_id": getattr(request.state, "request_id", None),
                        "action": "start_monitoring",
                    }
                )
            )
            logger.info(
                "Monitoring start trigger created",
                extra={
                    "action": "monitoring_trigger_created",
                    "trigger_file": str(trigger_file),
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
            return {
                "success": True,
                "message": "Monitoring start requested. Run 'DOCKER.ps1 -WithMonitoring' from host or wait for auto-start if watcher is enabled.",
                "details": {
                    "trigger_file": str(trigger_file),
                    "mode": "container_trigger",
                    "instructions": "Execute 'docker compose -f docker/docker-compose.monitoring.yml up -d' on the host to start monitoring.",
                },
            }
        except Exception as e:
            logger.error(f"Failed to create trigger file: {e}")
            raise http_error(
                500,
                ErrorCode.CONTROL_OPERATION_FAILED,
                f"Cannot start monitoring from container. Use DOCKER.ps1 -WithMonitoring from host. Trigger creation failed: {str(e)}",
                request,
            )

    if not check_docker_running():
        raise http_error(503, ErrorCode.CONTROL_DEPENDENCY_ERROR, "Docker is not running", request)

    monitoring_compose = Path("docker-compose.monitoring.yml")
    if not monitoring_compose.exists():
        raise http_error(404, ErrorCode.CONTROL_FILE_NOT_FOUND, "Monitoring compose file not found", request)

    try:
        success, stdout, stderr = docker_compose(["-f", "docker-compose.monitoring.yml", "up", "-d"], timeout=120)
        if not success:
            logger.error(
                "Failed to start monitoring stack",
                extra={
                    "action": "monitoring_start_failed",
                    "stderr": str(stderr),
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
            raise http_error(500, ErrorCode.CONTROL_OPERATION_FAILED, "Failed to start monitoring stack", request)
        settings = get_settings()
        logger.info(
            "Monitoring stack started",
            extra={
                "action": "monitoring_start_success",
                "services": ["grafana", "prometheus", "loki"],
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return {
            "success": True,
            "message": "Monitoring stack started successfully",
            "details": {
                "services": ["grafana", "prometheus", "loki"],
                "grafana_url": settings.GRAFANA_URL,
                "prometheus_url": settings.PROMETHEUS_URL,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Monitoring stack start failed unexpectedly",
            extra={
                "action": "monitoring_start_error",
                "error": str(exc),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise http_error(
            500,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "Monitoring stack start failed",
            request,
            context={"error": "An unexpected error occurred"},
        ) from exc


@router.post("/monitoring/stop")
@limiter.limit(RATE_LIMIT_HEAVY)
async def stop_monitoring_stack(request: Request):
    import logging

    logger = logging.getLogger(__name__)
    logger.info(
        "Monitoring stack stop requested",
        extra={
            "action": "monitoring_stop_requested",
            "request_id": getattr(request.state, "request_id", None),
            "client_host": request.client.host if request.client else None,
        },
    )
    if in_docker_container():
        raise http_error(
            400,
            ErrorCode.CONTROL_OPERATION_FAILED,
            "Cannot stop monitoring from inside container. Use DOCKER.ps1 -Stop from host.",
            request,
        )
    if not check_docker_running():
        return {"success": True, "message": "Docker not running, monitoring stack already stopped", "details": {}}
    try:
        success, stdout, stderr = docker_compose(["-f", "docker-compose.monitoring.yml", "down"], timeout=60)
        if not success and "no configuration file provided" not in stderr.lower():
            raise http_error(
                500, ErrorCode.CONTROL_OPERATION_FAILED, f"Failed to stop monitoring stack: {stderr}", request
            )
        logger.info(
            "Monitoring stack stopped",
            extra={
                "action": "monitoring_stop_success",
                "services": ["grafana", "prometheus", "loki"],
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return {"success": True, "message": "Monitoring stack stopped successfully", "details": {"output": stdout}}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Monitoring stack stop failed unexpectedly",
            extra={
                "action": "monitoring_stop_error",
                "error": str(exc),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise http_error(
            500, ErrorCode.INTERNAL_SERVER_ERROR, f"Unexpected error stopping monitoring: {str(exc)}", request
        ) from exc


@router.get("/monitoring/prometheus/query")
@limiter.limit(RATE_LIMIT_READ)
async def prometheus_query(request: Request, query: str, time: Optional[float] = None):
    try:
        import httpx

        settings = get_settings()
        base = settings.PROMETHEUS_URL.rstrip("/") + "/"
        url = urljoin(base, "api/v1/query")
        params: dict[str, Any] = {"query": query}
        if time is not None:
            params["time"] = str(time)
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data
    except HTTPError as e:
        raise http_error(
            502, ErrorCode.CONTROL_DEPENDENCY_ERROR, "Failed to query Prometheus", request, context={"error": str(e)}
        ) from e
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Unexpected error querying Prometheus",
            request,
            context={"error": str(exc)},
        ) from exc


@router.get("/monitoring/prometheus/range")
@limiter.limit(RATE_LIMIT_READ)
async def prometheus_query_range(request: Request, query: str, start: float, end: float, step: str = "30s"):
    try:
        import httpx

        settings = get_settings()
        base = settings.PROMETHEUS_URL.rstrip("/") + "/"
        url = urljoin(base, "api/v1/query_range")
        params: dict[str, Any] = {"query": query, "start": str(start), "end": str(end), "step": step}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data
    except HTTPError as e:
        raise http_error(
            502,
            ErrorCode.CONTROL_DEPENDENCY_ERROR,
            "Failed to query Prometheus (range)",
            request,
            context={"error": str(e)},
        ) from e
    except Exception as exc:
        raise http_error(
            500,
            ErrorCode.INTERNAL_SERVER_ERROR,
            "Unexpected error querying Prometheus (range)",
            request,
            context={"error": str(exc)},
        ) from exc
