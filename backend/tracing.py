"""OpenTelemetry tracing setup (optional).

Enable by setting environment variable ENABLE_TRACING=1.
Uses OTLP exporter for standard OpenTelemetry Protocol support.

Environment variables:
- ENABLE_TRACING=1
- OTLP_ENDPOINT=http://localhost:4318 (default if not specified)
"""

from __future__ import annotations

import os
import logging
from fastapi import FastAPI

logger = logging.getLogger(__name__)


def setup_tracing(app: FastAPI) -> None:
    if (os.environ.get("ENABLE_TRACING") or "").strip().lower() not in {"1", "true", "yes", "on"}:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        resource = Resource.create({"service.name": "student-management-system"})
        provider = TracerProvider(resource=resource)

        # Use OTLP exporter (compatible with Jaeger, Tempo, and other backends)
        otlp_endpoint = os.environ.get("OTLP_ENDPOINT", "http://localhost:4318")
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint)

        processor = BatchSpanProcessor(exporter)  # type: ignore[arg-type]
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        app.state.tracer_provider = provider
        logger.info("Tracing initialized with OTLP endpoint: %s", otlp_endpoint)
    except Exception as exc:  # pragma: no cover
        logger.warning("Tracing setup failed: %s", exc)
