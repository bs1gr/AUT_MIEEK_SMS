# Load Testing with Locust

This directory contains load testing scripts for the Student Management System API using [Locust](https://locust.io/).

## Quick Start

1. **Install Locust:**
   ```bash
   pip install locust
   ```

2. **Run Locust:**
   ```bash
   cd load_tests
   locust
   ```
   Then open [http://localhost:8089](http://localhost:8089) in your browser.

3. **Configure the target host:**
   - Enter the API base URL (e.g., `http://localhost:8000` for native, `http://localhost:8080` for Docker)
   - Set number of users and spawn rate as desired

## Example Tasks
- Health check endpoint
- Login endpoint
- List students endpoint

## Extending
- Add more tasks to `locustfile.py` to cover additional API endpoints and workflows.
- For authenticated endpoints, implement token retrieval and reuse in the user class.

## Baseline Performance
- Record results for 10, 50, 100, and 200 users.
- Note response times, failure rates, and bottlenecks.
- Save screenshots or export Locust stats for documentation.

---

**Tip:** For production-like tests, use real data and realistic user behavior patterns.
