import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Test: Database Stress
 * Scenario: 100 concurrent users with 1000 total dashboards
 * Duration: 15 minutes
 * Target: Consistent performance under load
 */

export const options = {
  stages: [
    { duration: '2m', target: 25 },    // Ramp up to 25
    { duration: '2m', target: 50 },    // Ramp up to 50
    { duration: '2m', target: 100 },   // Ramp up to 100
    { duration: '8m', target: 100 },   // Stay at 100
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  // Create dashboard (adds to total)
  const dashboardName = `DB-Stress-${__VU}-${__ITER}-${Date.now()}`;

  const createPayload = JSON.stringify({
    name: dashboardName,
    description: 'Database stress test dashboard',
    configuration: {
      charts: ['performance', 'gradeDistribution', 'attendance', 'trend'],
    },
  });

  const createRes = http.post(`${BASE_URL}/dashboards`, createPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(createRes, {
    'stress test create status 200': (r) => r.status === 200 || r.status === 201,
    'stress test create response time': (r) => r.timings.duration < 1000,
    'create returns ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Extract dashboard ID for follow-up query
  try {
    const createBody = JSON.parse(createRes.body);
    if (createBody.id) {
      // Query the dashboard we just created
      sleep(0.5);

      const queryRes = http.get(`${BASE_URL}/dashboards/${createBody.id}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      });

      check(queryRes, {
        'stress test query status 200': (r) => r.status === 200,
        'stress test query response time': (r) => r.timings.duration < 500,
      });
    }
  } catch {
    // Ignore parse errors
  }

  sleep(1);
}
