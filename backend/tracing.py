"""OpenTelemetry tracing setup (optional).

Enable by setting environment variable ENABLE_TRACING=1.
Supports Jaeger (thrift) or OTLP exporter depending on env settings.

Environment variables:
- ENABLE_TRACING=1
- OTLP_ENDPOINT=http://localhost:4318
- JAEGER_AGENT_HOST=localhost
- JAEGER_AGENT_PORT=6831
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

        resource = Resource.create({"service.name": "student-management-system"})
        provider = TracerProvider(resource=resource)

        # Prefer OTLP exporter if endpoint provided, else try Jaeger thrift
        exporter = None
        otlp_endpoint = os.environ.get("OTLP_ENDPOINT")
        if otlp_endpoint:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        else:
            from opentelemetry.exporter.jaeger.thrift import JaegerExporter
            host = os.environ.get("JAEGER_AGENT_HOST", "localhost")
            port = int(os.environ.get("JAEGER_AGENT_PORT", "6831"))
            exporter = JaegerExporter(agent_host_name=host, agent_port=port)

        processor = BatchSpanProcessor(exporter)  # type: ignore[arg-type]
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        app.state.tracer_provider = provider
        logger.info("Tracing initialized")
    except Exception as exc:  # pragma: no cover
        logger.warning("Tracing setup failed: %s", exc)
