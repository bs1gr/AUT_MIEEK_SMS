# Application Metrics Export & Monitoring Guide

**Purpose:** Enable real-time monitoring and alerting by exporting application metrics to Prometheus and/or OpenTelemetry-compatible systems.

---

## 🛠️ Tools & Libraries

- **Prometheus Python Client:** `prometheus_client`
- **OpenTelemetry Python SDK:** `opentelemetry-sdk`, `opentelemetry-instrumentation-fastapi`
- **Grafana:** For dashboards and alerting

---

## 📋 Checklist

- [ ] Install required libraries (`prometheus_client`, `opentelemetry-sdk`, etc.)
- [ ] Add FastAPI middleware for metrics export (see `backend/middleware_config.py`)
- [ ] Expose `/metrics` endpoint (Prometheus scrape target)
- [ ] Configure Prometheus to scrape the endpoint
- [ ] (Optional) Instrument custom metrics (e.g., request latency, DB query time, error rates)
- [ ] (Optional) Integrate OpenTelemetry for distributed tracing
- [ ] Create Grafana dashboards for key metrics
- [ ] Set up alerting for error rates, latency, resource usage

---

## 📝 Example: FastAPI Prometheus Integration

```python
from prometheus_client import make_asgi_app
from fastapi import FastAPI

app = FastAPI()
app.mount("/metrics", make_asgi_app())

```text
---

## 📂 Where to Document

- `docs/operations/METRICS_MONITORING.md` (setup, dashboards, alerting)
- Prometheus/Grafana config files

---

_Last updated: 2025-12-18_
