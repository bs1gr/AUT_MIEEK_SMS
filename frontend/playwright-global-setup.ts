import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as http from 'http';

const execAsync = promisify(exec);

const BACKEND_PORT = 8000;
const BACKEND_HEALTH_CHECK_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;
const BACKEND_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 60000; // 60 seconds

/**
 * Check if backend is healthy by making a request to /health endpoint
 */
async function isBackendHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkHealth = () => {
      const req = http.get(BACKEND_HEALTH_CHECK_URL, (res) => {
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
  console.log('🚀 Starting backend server on port 8000...');

  try {
    // Determine the correct Python command
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Start the backend with uvicorn in detached mode
    // This runs in the background without blocking the test setup
    const backendCommand = `${pythonCmd} -m uvicorn backend.main:app --host 127.0.0.1 --port ${BACKEND_PORT} --reload`;

    if (process.platform === 'win32') {
      // On Windows, use spawn to run in background
      const { spawn } = require('child_process');
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
      console.warn('   Tests will skip gracefully if backend is unavailable.');
    }
  } catch (error) {
    console.warn('⚠️  Failed to start backend:', error instanceof Error ? error.message : String(error));
    console.warn('   Tests will skip gracefully if backend is unavailable.');
  }
}

/**
 * Global setup: Run once before all tests
 */
async function globalSetup(config: FullConfig) {
  // Only auto-start backend if not in CI (CI has its own setup)
  if (!process.env.CI) {
    const backendHealthy = await isBackendHealthy();

    if (!backendHealthy) {
      console.log('\n📝 Backend not detected. Attempting to auto-start...\n');
      await startBackend();
    } else {
      console.log('✅ Backend already running on port 8000\n');
    }
  } else {
    console.log('✅ CI environment detected: backend will be started by workflow\n');
  }
}

export default globalSetup;
