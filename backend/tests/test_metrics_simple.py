"""Simple script to verify prometheus-fastapi-instrumentator works.

Note:
- This file is not part of the pytest suite; it's a manual test helper.
- Import of the instrumentator is optional to avoid test collection failures
    in environments where the package isn't installed.
"""
from fastapi import FastAPI

try:  # Optional dependency for local manual testing only
        from prometheus_fastapi_instrumentator import Instrumentator  # type: ignore
except Exception:  # pragma: no cover - keep imports optional for CI
        Instrumentator = None  # type: ignore

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello"}

# Setup instrumentator only when available and script is run directly
if Instrumentator is not None:
    instrumentator = Instrumentator()
    instrumentator.instrument(app)
    instrumentator.expose(app, endpoint="/metrics")

if __name__ == "__main__":
    import uvicorn
    print("Starting test server on http://127.0.0.1:8001")
    if Instrumentator is None:
        print("prometheus-fastapi-instrumentator not installed; /metrics will not be exposed.")
    else:
        print("Test /metrics at: http://127.0.0.1:8001/metrics")
    uvicorn.run(app, host="127.0.0.1", port=8001)
