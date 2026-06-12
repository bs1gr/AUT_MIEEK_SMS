import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E Test Diagnostics
 * Captures page state, logs, and error information for debugging test failures
 */

export interface DiagnosticData {
  timestamp: string;
  url: string;
  title: string;
  consoleLogs: Array<{ type: string; message: string }>;
  pageError?: string;
  screenPath?: string;
  htmlPath?: string;
  networkLogs: Array<{ url: string; status: number; type: string }>;
}

const diagnosticsDir = path.join(process.cwd(), 'test-diagnostics');

export async function initDiagnosticsDir() {
  if (!fs.existsSync(diagnosticsDir)) {
    fs.mkdirSync(diagnosticsDir, { recursive: true });
  }
}

export async function captureDiagnostics(page: Page, testName: string): Promise<DiagnosticData> {
  const timestamp = new Date().toISOString();
  const testDir = path.join(diagnosticsDir, testName.replace(/\s+/g, '_'));

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const diagnostics: DiagnosticData = {
    timestamp,
    url: page.url(),
    title: await page.title(),
    consoleLogs: [],
    networkLogs: [],
  };

  // Capture console logs
  const consoleLogs: Array<{ type: string; message: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      message: msg.text(),
    });
  });

  // Capture page errors
  let pageError: string | undefined;
  page.on('pageerror', (error) => {
    pageError = error.toString();
  });

  // Wait a bit for any pending logs
  await page.waitForTimeout(500).catch(() => {});

  diagnostics.consoleLogs = consoleLogs;
  diagnostics.pageError = pageError;

  // Capture screenshot
  const screenPath = path.join(testDir, `screenshot_${Date.now()}.png`);
  try {
    await page.screenshot({ path: screenPath });
    diagnostics.screenPath = screenPath;
  } catch (e) {
    console.error('Failed to capture screenshot:', e);
  }

  // Capture HTML
  const htmlPath = path.join(testDir, `page_${Date.now()}.html`);
  try {
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);
    diagnostics.htmlPath = htmlPath;
  } catch (e) {
    console.error('Failed to capture HTML:', e);
  }

  // Save diagnostics JSON
  const diagPath = path.join(testDir, `diagnostics_${Date.now()}.json`);
  fs.writeFileSync(diagPath, JSON.stringify(diagnostics, null, 2));

  console.log(`📋 Diagnostics saved to ${diagPath}`);

  return diagnostics;
}

export function logDiagnostics(diagnostics: DiagnosticData) {
  console.log('\n=== PAGE DIAGNOSTICS ===');
  console.log(`URL: ${diagnostics.url}`);
  console.log(`Title: ${diagnostics.title}`);
  console.log(`Timestamp: ${diagnostics.timestamp}`);

  if (diagnostics.consoleLogs.length > 0) {
    console.log('\n--- Console Logs ---');
    diagnostics.consoleLogs.forEach((log) => {
      console.log(`[${log.type.toUpperCase()}] ${log.message}`);
    });
  }

  if (diagnostics.pageError) {
    console.log(`\n❌ Page Error: ${diagnostics.pageError}`);
  }

  if (diagnostics.screenPath) {
    console.log(`📸 Screenshot: ${diagnostics.screenPath}`);
  }

  if (diagnostics.htmlPath) {
    console.log(`📄 HTML: ${diagnostics.htmlPath}`);
  }

  console.log('======================\n');
}

export async function captureAndLogDiagnostics(page: Page, testName: string) {
  const diagnostics = await captureDiagnostics(page, testName);
  logDiagnostics(diagnostics);
  return diagnostics;
}
