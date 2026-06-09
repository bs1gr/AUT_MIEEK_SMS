import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Test: Dashboard Creation Storm
 * Scenario: 100 concurrent users creating dashboards
 * Duration: 5 minutes
 * Target: 0% error rate, P95 < 500ms
 */

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  // Generate unique dashboard name
  const dashboardName = `Load-Test-Dashboard-${Date.now()}-${Math.random()}`;

  // Dashboard creation payload
  const payload = JSON.stringify({
    name: dashboardName,
    description: 'Load test dashboard',
    configuration: {
      charts: ['performance', 'gradeDistribution', 'attendance'],
    },
  });

  // Create dashboard
  const createRes = http.post(`${BASE_URL}/dashboards`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  // Check response
  check(createRes, {
    'create dashboard status 200': (r) => r.status === 200 || r.status === 201,
    'create response time < 500ms': (r) => r.timings.duration < 500,
    'create response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    'dashboard created with ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.name === dashboardName;
      } catch {
        return false;
      }
    },
  });

  // Small delay between requests
  sleep(1);
}
