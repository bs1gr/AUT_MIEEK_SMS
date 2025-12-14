# Load Testing Troubleshooting Guide

This guide helps diagnose and resolve common issues encountered during load testing of the Student Management System.

## Common Issues and Solutions

### Locust Installation Issues

#### Problem: Import errors when running Locust
```
ModuleNotFoundError: No module named 'locust'
```

**Solutions:**
1. **Check Python version compatibility:**
   ```bash
   python --version  # Should be 3.8+
   ```

2. **Install in virtual environment:**
   ```bash
   cd load-testing/locust
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Update pip and reinstall:**
   ```bash
   pip install --upgrade pip
   pip install --force-reinstall locust
   ```

#### Problem: Faker library conflicts
```
ImportError: cannot import name 'Factory' from 'faker'
```

**Solution:**
```bash
pip uninstall faker
pip install faker==15.3.4  # Compatible version
```

### Test Execution Issues

#### Problem: Connection refused errors
```
ConnectionError: HTTPConnectionPool(host='localhost', port=8000): Max retries exceeded
```

**Solutions:**
1. **Verify target service is running:**
   ```bash
   # For native development
   .\NATIVE.ps1 -Status

   # For Docker deployment
   .\DOCKER.ps1 -Status
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:8000/health
   ```

3. **Verify Locust configuration:**
   ```python
   # In locustfile.py, check host configuration
   class BaseUser(FastHttpUser):
       host = "http://localhost:8000"  # Adjust as needed
   ```

4. **Check firewall/network settings:**
   ```bash
   # Windows Firewall
   netsh advfirewall firewall show rule name=all | findstr "8000"

   # Test connectivity
   telnet localhost 8000
   ```

#### Problem: Authentication failures during tests
```
HTTPError: 401 Unauthorized
```

**Solutions:**
1. **Verify authentication setup:**
   ```python
   # Check auth token generation in test setup
   def setup_test_data(self):
       self.auth_token = self.authenticate()
   ```

2. **Check AUTH_MODE configuration:**
   ```bash
   # In environment variables
   echo $AUTH_MODE  # Should be 'disabled' for testing
   ```

3. **Validate test user credentials:**
   ```python
   # Ensure test users exist in database
   test_user = {"email": "test@example.com", "password": "testpass"}
   ```

4. **Check token expiration:**
   ```python
   # Implement token refresh logic
   def authenticate(self):
       response = self.client.post("/auth/login", json=self.test_user)
       token = response.json()["access_token"]
       self.client.headers.update({"Authorization": f"Bearer {token}"})
       return token
   ```

#### Problem: Database connection pool exhausted
```
psycopg2.OperationalError: FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**Solutions:**
1. **Increase database connection pool:**
   ```python
   # In database configuration
   SQLALCHEMY_POOL_SIZE = 50
   SQLALCHEMY_MAX_OVERFLOW = 100
   ```

2. **Implement connection pooling in tests:**
   ```python
   # Use session-based connections
   from sqlalchemy.orm import sessionmaker

   SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
   ```

3. **Add connection retry logic:**
   ```python
   def get_db_with_retry():
       for attempt in range(3):
           try:
               db = SessionLocal()
               return db
           except Exception as e:
               if attempt == 2:
                   raise e
               time.sleep(1)
   ```

4. **Monitor database connections:**
   ```sql
   SELECT count(*) as connections FROM pg_stat_activity;
   ```

### Performance Issues

#### Problem: Tests run slower than expected
**Symptoms:** Response times > 5 seconds, low RPS

**Solutions:**
1. **Optimize Locust configuration:**
   ```python
   class HeavyUser(FastHttpUser):
       wait_time = between(1, 3)  # Reduce wait time
       network_timeout = 30.0     # Increase timeout
   ```

2. **Check system resources:**
   ```bash
   # CPU usage
   top -p $(pgrep -f locust)

   # Memory usage
   ps aux --sort=-%mem | head -10
   ```

3. **Profile test execution:**
   ```python
   # Add timing decorators
   import time
   from functools import wraps

   def timing_decorator(func):
       @wraps(func)
       def wrapper(*args, **kwargs):
           start = time.time()
           result = func(*args, **kwargs)
           end = time.time()
           print(f"{func.__name__} took {end - start:.2f} seconds")
           return result
       return wrapper
   ```

4. **Use FastHttpUser instead of HttpUser:**
   ```python
   # FastHttpUser is more efficient for high loads
   class OptimizedUser(FastHttpUser):
       # Configuration here
   ```

#### Problem: Memory leaks during long tests
**Symptoms:** Increasing memory usage, eventual OOM kills

**Solutions:**
1. **Implement proper cleanup:**
   ```python
   class TestUser(FastHttpUser):
       def on_stop(self):
           # Clean up resources
           if hasattr(self, 'client'):
               self.client.close()
   ```

2. **Use context managers for database sessions:**
   ```python
   def test_operation(self):
       with get_db() as db:
           # Database operations
           pass
   ```

3. **Monitor memory usage:**
   ```python
   import psutil
   import os

   def log_memory_usage():
       process = psutil.Process(os.getpid())
       memory_mb = process.memory_info().rss / 1024 / 1024
       print(f"Memory usage: {memory_mb:.2f} MB")
   ```

4. **Implement garbage collection:**
   ```python
   import gc

   @events.test_stop.add_listener
   def cleanup_on_stop(environment, **kwargs):
       gc.collect()
   ```

### Data Generation Issues

#### Problem: Duplicate data conflicts
```
IntegrityError: UNIQUE constraint failed
```

**Solutions:**
1. **Use unique data generation:**
   ```python
   from faker import Faker
   fake = Faker()

   def generate_unique_student(self):
       return {
           "student_id": f"STU{self.student_counter:06d}",
           "email": f"student{self.student_counter}@test.com",
           "name": fake.name()
       }
       self.student_counter += 1
   ```

2. **Implement cleanup between test runs:**
   ```python
   def cleanup_test_data(self):
       # Remove test data after tests
       self.client.delete("/admin/cleanup-test-data")
   ```

3. **Use test-specific database:**
   ```bash
   # Use separate test database
   export DATABASE_URL="sqlite:///./test_sms.db"
   ```

#### Problem: Inconsistent test data
**Symptoms:** Tests fail due to missing prerequisites

**Solutions:**
1. **Implement proper test data setup:**
   ```python
   def setup_method(self):
       self.test_students = []
       self.test_courses = []
       self.setup_test_data()

   def setup_test_data(self):
       # Create prerequisite data
       self.create_test_students(10)
       self.create_test_courses(5)
   ```

2. **Use fixtures for shared data:**
   ```python
   @pytest.fixture(scope="session")
   def test_data():
       return generate_test_dataset()
   ```

3. **Validate data before tests:**
   ```python
   def validate_test_data(self):
       # Ensure required data exists
       response = self.client.get("/students/")
       assert response.status_code == 200
       assert len(response.json()) >= 10
   ```

### Analysis and Reporting Issues

#### Problem: Analysis script fails with data errors
```
ValueError: could not convert string to float
```

**Solutions:**
1. **Validate CSV data format:**
   ```python
   import pandas as pd

   def validate_csv_data(file_path):
       df = pd.read_csv(file_path)
       print(f"Columns: {df.columns.tolist()}")
       print(f"Data types: {df.dtypes}")
       print(f"Sample data:\n{df.head()}")
   ```

2. **Handle missing data gracefully:**
   ```python
   def safe_float_convert(value):
       try:
           return float(value)
       except (ValueError, TypeError):
           return 0.0
   ```

3. **Add data validation:**
   ```python
   def validate_results_data(results_dir):
       required_files = ['stats.csv', 'failures.csv']
       for file in required_files:
           if not (results_dir / file).exists():
               raise FileNotFoundError(f"Required file {file} not found")
   ```

#### Problem: Report generation fails
```
KeyError: 'response_time_percentile_95'
```

**Solutions:**
1. **Check data structure:**
   ```python
   def debug_data_structure(data):
       import json
       print(json.dumps(data, indent=2, default=str))
   ```

2. **Add error handling:**
   ```python
   def safe_get_metric(data, key, default=0):
       try:
           return data.get(key, default)
       except (KeyError, TypeError):
           return default
   ```

3. **Validate analysis output:**
   ```python
   def validate_analysis_output(analysis_file):
       with open(analysis_file, 'r') as f:
           data = json.load(f)

       required_keys = ['response_time_p95', 'error_rate', 'requests_per_second']
       for key in required_keys:
           if key not in data:
               print(f"Warning: Missing key {key} in analysis")
   ```

### Docker Integration Issues

#### Problem: Container networking issues
```
ConnectionError: Name or service not known
```

**Solutions:**
1. **Check Docker network:**
   ```bash
   docker network ls
   docker network inspect sms_default
   ```

2. **Verify service names:**
   ```bash
   # In docker-compose.yml
   services:
     sms-fullstack:
       # Service name for internal networking
   ```

3. **Use correct host configuration:**
   ```python
   # In locustfile.py
   class DockerUser(FastHttpUser):
       host = "http://sms-fullstack:8080"  # Use service name
   ```

4. **Check container logs:**
   ```bash
   docker-compose logs sms-fullstack
   docker-compose logs locust-master
   ```

#### Problem: Resource constraints in Docker
**Symptoms:** Tests fail with resource exhaustion

**Solutions:**
1. **Increase Docker resource limits:**
   ```yaml
   # docker-compose.yml
   services:
     locust-worker:
       deploy:
         resources:
           limits:
             cpus: '2.0'
             memory: 4G
           reservations:
             cpus: '1.0'
             memory: 2G
   ```

2. **Scale worker containers:**
   ```bash
   docker-compose up -d --scale locust-worker=5
   ```

3. **Monitor container resources:**
   ```bash
   docker stats
   ```

### Monitoring Integration Issues

#### Problem: Prometheus metrics not appearing
**Solutions:**
1. **Check Prometheus configuration:**
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'locust'
       static_configs:
         - targets: ['locust-master:8089']
   ```

2. **Verify metrics endpoint:**
   ```bash
   curl http://localhost:8089/metrics
   ```

3. **Check Grafana data sources:**
   ```json
   {
     "name": "Prometheus",
     "type": "prometheus",
     "url": "http://prometheus:9090",
     "access": "proxy"
   }
   ```

4. **Validate metric names:**
   ```python
   # In locustfile.py
   from prometheus_client import Gauge, Counter

   response_time_gauge = Gauge('locust_response_time', 'Response time')
   ```

### CI/CD Integration Issues

#### Problem: Pipeline fails on performance regression
**Solutions:**
1. **Adjust threshold values:**
   ```json
   // performance_thresholds.json
   {
     "response_time_p95": {
       "warning": 3.0,
       "critical": 8.0
     }
   }
   ```

2. **Implement gradual threshold increases:**
   ```python
   def adaptive_thresholds(historical_data):
       # Calculate thresholds based on historical performance
       pass
   ```

3. **Add baseline comparisons:**
   ```python
   def compare_to_baseline(current, baseline):
       tolerance = 0.1  # 10% tolerance
       return abs(current - baseline) / baseline <= tolerance
   ```

4. **Separate warning from failure:**
   ```python
   # Warnings don't fail the build
   if metric > threshold_warning:
       print(f"⚠️ Warning: {metric_name} is high")
   if metric > threshold_critical:
       print(f"❌ Critical: {metric_name} exceeds threshold")
       exit(1)
   ```

### Advanced Troubleshooting

#### Problem: Distributed testing issues
**Solutions:**
1. **Check master-worker communication:**
   ```bash
   # On master
   netstat -tlnp | grep 5557  # Default Locust port

   # On workers
   telnet locust-master 5557
   ```

2. **Verify distributed configuration:**
   ```python
   # Master configuration
   locust --master --master-bind-host=0.0.0.0 --master-bind-port=5557

   # Worker configuration
   locust --worker --master-host=locust-master --master-port=5557
   ```

3. **Monitor distributed performance:**
   ```python
   @events.spawning_complete.add_listener
   def on_spawning_complete(user_count, **kwargs):
       print(f"Spawned {user_count} users across workers")
   ```

#### Problem: High CPU usage on test machine
**Solutions:**
1. **Optimize Locust settings:**
   ```python
   class EfficientUser(FastHttpUser):
       wait_time = between(2, 5)  # Increase wait time
       connection_timeout = 10.0   # Reduce timeout
   ```

2. **Use connection pooling:**
   ```python
   from requests.adapters import HTTPAdapter
   from requests.packages.urllib3.util.retry import Retry

   class PooledUser(FastHttpUser):
       def __init__(self, *args, **kwargs):
           super().__init__(*args, **kwargs)
           retry_strategy = Retry(total=3, backoff_factor=1)
           adapter = HTTPAdapter(max_retries=retry_strategy)
           self.client.mount("http://", adapter)
           self.client.mount("https://", adapter)
   ```

3. **Monitor system resources:**
   ```bash
   # CPU and memory monitoring
   htop
   iostat -x 1
   free -h
   ```

#### Problem: Inconsistent test results
**Solutions:**
1. **Implement result stabilization:**
   ```python
   def stabilize_results(results, window_size=5):
       # Calculate moving averages
       return pd.Series(results).rolling(window=window_size).mean()
   ```

2. **Add result validation:**
   ```python
   def validate_test_run(results):
       min_requests = 1000
       if len(results) < min_requests:
           raise ValueError(f"Insufficient test data: {len(results)} requests")
   ```

3. **Use statistical analysis:**
   ```python
   from scipy import stats

   def statistical_summary(data):
       return {
           'mean': np.mean(data),
           'median': np.median(data),
           'std': np.std(data),
           'confidence_interval': stats.t.interval(0.95, len(data)-1, loc=np.mean(data), scale=stats.sem(data))
       }
   ```

### Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs:**
   ```bash
   # Locust logs
   locust --loglevel DEBUG

   # Application logs
   tail -f backend/logs/app.log
   ```

2. **Gather diagnostic information:**
   ```bash
   # System information
   uname -a
   python --version
   pip list | grep locust

   # Test environment
   env | grep -E "(AUTH|DATABASE|REDIS)"
   ```

3. **Create a minimal reproduction case:**
   ```python
   # Simple test case to isolate the issue
   class MinimalUser(FastHttpUser):
       @task
       def minimal_task(self):
           self.client.get("/health")
   ```

4. **Report issues with complete context:**
   - Locust version and configuration
   - System specifications
   - Full error messages and stack traces
   - Steps to reproduce the issue

This troubleshooting guide should help resolve most common load testing issues. For complex problems, consider consulting the Locust documentation or community forums.