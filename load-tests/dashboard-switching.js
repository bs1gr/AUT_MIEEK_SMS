import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Test: Dashboard Switching Load
 * Scenario: 50 concurrent users rapidly switching between dashboards
 * Duration: 10 minutes
 * Target: < 100ms response time, 0% errors
 */

export const options = {
  stages: [
    { duration: '1m', target: 25 },    // Ramp up to 25 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '8m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<500'], // Very fast switching
    http_req_failed: ['rate<0.001'], // Error rate < 0.1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Pre-created dashboard IDs for switching test
const DASHBOARD_IDS = ['1', '2', '3', '4', '5'];

export default function () {
  // Pick a random dashboard to switch to
  const dashboardId = DASHBOARD_IDS[Math.floor(Math.random() * DASHBOARD_IDS.length)];

  // GET dashboard details (simulates switching)
  const getRes = http.get(`${BASE_URL}/dashboards/${dashboardId}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(getRes, {
    'switch dashboard status 200': (r) => r.status === 200,
    'switch response time < 100ms': (r) => r.timings.duration < 100,
    'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    'dashboard has correct structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.configuration && body.configuration.charts;
      } catch {
        return false;
      }
    },
  });

  // Rapid requests without delay (simulates rapid switching)
  sleep(0.5);
}
