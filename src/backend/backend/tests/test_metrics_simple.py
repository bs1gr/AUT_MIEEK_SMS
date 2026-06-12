"""Manual helper for verifying the metrics endpoint locally.

Note:
- This file is not part of the pytest suite; it is a lightweight local
  verification helper for the metrics wiring.
"""

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Hello"}


if __name__ == "__main__":
    import uvicorn

    print("Starting test server on http://127.0.0.1:8001")
    print("Test /metrics at: http://127.0.0.1:8001/metrics")
    uvicorn.run(app, host="127.0.0.1", port=8001)
