/**
 * E2E Test Logging Utilities
 *
 * Provides structured logging for E2E tests to help diagnose issues
 * in CI environments.
 */

import { Page } from '@playwright/test';

export interface TestLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: string;
  message: string;
  details?: Record<string, unknown>;
}

const logs: TestLog[] = [];

/**
 * Log a message with context
 */
export function logTest(
  category: string,
  message: string,
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO',
  details?: Record<string, unknown>
) {
  const log: TestLog = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };

  logs.push(log);

  // Also log to console for Playwright output
  const prefix = `[${log.timestamp}] [${level}] [${category}]`;
  if (details) {
    console.log(prefix, message, JSON.stringify(details, null, 2));
  } else {
    console.log(prefix, message);
  }
}

/**
 * Capture page diagnostics (console errors, network failures, etc.)
 */
export async function capturePageDiagnostics(page: Page, testName: string) {
  const consoleMessages: string[] = [];
  const networkFailures: string[] = [];

  const pageReady = new Promise<void>((resolve) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    page.on('requestfailed', (req) => {
      networkFailures.push(`${req.url()} - ${req.failure()?.errorText}`);
    });

    // Resolve after 1 second of collection
    setTimeout(() => resolve(), 1000);
  });

  await pageReady;

  logTest('PAGE_DIAGNOSTICS', `Diagnostics for: ${testName}`, 'INFO', {
    consoleMessages,
    networkFailures,
    url: page.url(),
    title: await page.title(),
  });
}

/**
 * Log API request/response for debugging
 */
export async function logAPICall(
  page: Page,
  method: string,
  url: string,
  data?: unknown,
  response?: Response
) {
  const statusCode = response?.status || 'PENDING';
  const contentType = response?.headers.get('content-type') || 'unknown';

  logTest('API_CALL', `${method} ${url}`, 'DEBUG', {
    statusCode,
    contentType,
    dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
    ok: response?.ok,
  });
}

/**
 * Log navigation event
 */
export function logNavigation(from: string, to: string, reason: string) {
  logTest('NAVIGATION', `${from} → ${to}`, 'DEBUG', { reason });
}

/**
 * Log element interaction
 */
export async function logElementInteraction(
  page: Page,
  selector: string,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    const count = await page.locator(selector).count();
    logTest('ELEMENT_INTERACTION', `${action} ${selector}`, 'DEBUG', {
      elementCount: count,
      pageUrl: page.url(),
      ...details,
    });
  } catch (e) {
    logTest('ELEMENT_INTERACTION', `${action} ${selector}`, 'WARN', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Log auth-related events
 */
export function logAuthEvent(event: string, email: string, success: boolean, error?: string) {
  logTest('AUTH', event, success ? 'INFO' : 'ERROR', {
    email,
    success,
    error,
  });
}

/**
 * Log test phase
 */
export function logPhase(phase: string, description?: string) {
  logTest('TEST_PHASE', phase, 'INFO', { description });
}

/**
 * Get all collected logs
 */
export function getLogs(): TestLog[] {
  return [...logs];
}

/**
 * Get logs for a specific category
 */
export function getLogsByCategory(category: string): TestLog[] {
  return logs.filter((log) => log.category === category);
}

/**
 * Export logs as JSON (useful for CI artifact upload)
 */
export function exportLogsAsJSON(): string {
  return JSON.stringify(
    {
      exportTime: new Date().toISOString(),
      totalLogs: logs.length,
      byCategory: Object.fromEntries(
        [...new Set(logs.map((l) => l.category))].map((cat) => [
          cat,
          logs.filter((l) => l.category === cat).length,
        ])
      ),
      logs,
    },
    null,
    2
  );
}

/**
 * Clear logs (useful between test phases)
 */
export function clearLogs() {
  logs.length = 0;
}
