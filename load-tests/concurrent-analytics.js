import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Load Test: Concurrent Analytics Access
 * Scenario: 200 concurrent users accessing analytics with different dashboards
 * Duration: 10 minutes
 * Target: Even distribution, no slowdown
 */

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50
    { duration: '2m', target: 100 },   // Ramp up to 100
    { duration: '2m', target: 200 },   // Ramp up to 200
    { duration: '3m', target: 200 },   // Stay at 200
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const DASHBOARD_IDS = ['1', '2', '3', '4'];

export default function () {
  // Each VU gets a dashboard ID based on their ID
  const userIndex = __VU % DASHBOARD_IDS.length;
  const dashboardId = DASHBOARD_IDS[userIndex];

  // GET analytics data for this dashboard
  const analyticsRes = http.get(`${BASE_URL}/dashboards/${dashboardId}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(analyticsRes, {
    'analytics load status 200': (r) => r.status === 200,
    'analytics response < 1s': (r) => r.timings.duration < 1000,
    'analytics response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });

  // Simulate viewing multiple charts
  sleep(2);
}
