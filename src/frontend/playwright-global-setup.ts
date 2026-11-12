import { spawn, exec } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import { getApiBase } from './tests/e2e/helpers';

// The backend the specs talk to: PLAYWRIGHT_API_BASE_URL when it is set, otherwise the native
// default on :8000 (the same rule the specs and the teardown use). This used to be hard-coded to
// :8000, so an isolated run against another port still health-checked, and if nothing answered
// there even started, a server on whatever :8000 was.
const BACKEND_URL = getApiBase();
const BACKEND = new URL(BACKEND_URL);
const BACKEND_PORT = Number(BACKEND.port) || (BACKEND.protocol === 'https:' ? 443 : 80);
const BACKEND_HEALTH_CHECK_URL = `${BACKEND_URL}/health`;
// Only a backend on this machine can be started from here.
const BACKEND_IS_LOCAL = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(BACKEND.hostname);
const HEALTH_CHECK_TIMEOUT = 60000; // 60 seconds

/**
 * Check if backend is healthy by making a request to /health endpoint
 */
async function isBackendHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = BACKEND.protocol === 'https:' ? https : http;

    const checkHealth = () => {
      const req = client.get(BACKEND_HEALTH_CHECK_URL, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          if (Date.now() - startTime < HEALTH_CHECK_TIMEOUT) {
            setTimeout(checkHealth, 500);
          } else {
            resolve(false);
          }
        }
      });

      req.on('error', () => {
        if (Date.now() - startTime < HEALTH_CHECK_TIMEOUT) {
          setTimeout(checkHealth, 500);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(5000);
    };

    checkHealth();
  });
}

/**
 * Start the backend server using uvicorn
 */
async function startBackend(): Promise<void> {
  console.log(`🚀 Starting backend server on port ${BACKEND_PORT}...`);

  try {
    // Determine the correct Python command
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    if (process.platform === 'win32') {
      // On Windows, use spawn to run in background
      spawn(pythonCmd, [
        '-m', 'uvicorn',
        'backend.main:app',
        '--host', '127.0.0.1',
        '--port', String(BACKEND_PORT),
        '--reload'
      ], {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd()
      }).unref();
    } else {
      // On Unix-like systems
      const backendCommand = `${pythonCmd} -m uvicorn backend.main:app --host 127.0.0.1 --port ${BACKEND_PORT} --reload`;
      exec(`nohup ${backendCommand} > /tmp/backend.log 2>&1 &`, {
        cwd: process.cwd()
      });
    }

    console.log('⏳ Waiting for backend to become healthy...');
    const isHealthy = await isBackendHealthy();

    if (isHealthy) {
      console.log('✅ Backend is running and healthy!');
    } else {
      console.warn('⚠️  Backend health check failed, but proceeding with tests.');
      console.warn('   Tests will fail loudly if backend is unavailable.');
    }
  } catch (error) {
    console.warn('⚠️  Failed to start backend:', error instanceof Error ? error.message : String(error));
    console.warn('   Tests will fail loudly if backend is unavailable.');
  }
}

/**
 * Global setup: Run once before all tests
 */
async function globalSetup() {
  // Only auto-start backend if not in CI (CI has its own setup)
  if (!process.env.CI) {
    const backendHealthy = await isBackendHealthy();

    if (!backendHealthy) {
      if (!BACKEND_IS_LOCAL) {
        // Nothing can be started on another machine from here.
        console.warn(`\n⚠️  No healthy backend at ${BACKEND_URL}; it is not local, so it will not be started.\n`);
        return;
      }
      console.log(`\n📝 Backend not detected at ${BACKEND_URL}. Attempting to auto-start...\n`);
      await startBackend();
    } else {
      console.log(`✅ Backend already running at ${BACKEND_URL}\n`);
    }
  } else {
    console.log('✅ CI environment detected: backend will be started by workflow\n');
  }
}

export default globalSetup;
