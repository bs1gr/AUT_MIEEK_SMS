import * as http from 'http';
import * as https from 'https';
import { getApiBase } from './tests/e2e/helpers';

// The backend the specs talk to: PLAYWRIGHT_API_BASE_URL when it is set, otherwise the native
// default on :8000 (the same rule the specs and the teardown use).
const BACKEND_URL = getApiBase();
const BACKEND = new URL(BACKEND_URL);
const BACKEND_HEALTH_CHECK_URL = `${BACKEND_URL}/health`;
// A backend that is still starting gets this long to answer.
const HEALTH_CHECK_TIMEOUT = 20000;

/**
 * Whether the backend answers /health with 200 within HEALTH_CHECK_TIMEOUT.
 */
async function isBackendHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = BACKEND.protocol === 'https:' ? https : http;

    const retryOrGiveUp = () => {
      if (Date.now() - startTime < HEALTH_CHECK_TIMEOUT) {
        setTimeout(checkHealth, 500);
      } else {
        resolve(false);
      }
    };

    const checkHealth = () => {
      const req = client.get(BACKEND_HEALTH_CHECK_URL, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retryOrGiveUp();
        }
      });
      req.on('error', retryOrGiveUp);
      req.setTimeout(5000, () => req.destroy());
    };

    checkHealth();
  });
}

/**
 * Global setup: run once before all tests.
 *
 * This setup no longer starts a backend itself (owner's decision, 2026-11-20, plan todo 58).
 * It used to start `uvicorn backend.main:app --reload` from the frontend folder, where `backend`
 * cannot be imported: the reloader then held the port for ever with nothing serving. Started
 * from the right folder it would have been worse: the backend reads `backend/.env`, which on the
 * development PC points at the shared database, and the suite would have created its accounts
 * there. So a run without a backend now stops at once and says how to get an isolated one.
 */
async function globalSetup() {
  if (process.env.CI) {
    console.log('✅ CI environment detected: the workflow starts the backend\n');
    return;
  }

  if (await isBackendHealthy()) {
    console.log(`✅ Backend answering at ${BACKEND_URL}\n`);
    return;
  }

  throw new Error(
    [
      `No backend answers at ${BACKEND_HEALTH_CHECK_URL}.`,
      'The E2E suite does not start one itself: a backend started from this checkout would use',
      'backend/.env, which on the development PC is the shared database.',
      'Run the suite against a throwaway database instead, from the repository root:',
      '  .\\infra\\scripts\\testing\\RUN_E2E_ISOLATED.ps1',
      '  .\\infra\\scripts\\testing\\RUN_E2E_ISOLATED.ps1 -Spec tests/e2e/<file>.spec.ts',
      'or start an isolated backend yourself and set PLAYWRIGHT_API_BASE_URL to its address.',
    ].join('\n'),
  );
}

export default globalSetup;
