#!/usr/bin/env node
/*
 * Enforce policy-compliant frontend test execution.
 * Allows: CI (CI/GITHUB_ACTIONS), batch-runner context, or explicit override via SMS_ALLOW_DIRECT_VITEST/SMS_ALLOW_DIRECT_TESTS.
 * Blocks: direct ad-hoc vitest unless explicitly permitted.
 */

function isTrue(val) {
  if (typeof val !== "string") return false;
  const v = val.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

const env = process.env;
const isCI = isTrue(env.CI) || isTrue(env.GITHUB_ACTIONS);
const isBatch = (env.SMS_TEST_RUNNER || "").toLowerCase() === "batch";
const allowedOverride = isTrue(env.SMS_ALLOW_DIRECT_VITEST) || isTrue(env.SMS_ALLOW_DIRECT_TESTS);

if (isCI || isBatch || allowedOverride) {
  process.exit(0);
}

console.error(
  "Frontend tests must be run via policy-compliant tasks. " +
    "Use VS Code tasks or set SMS_TEST_RUNNER=batch (preferred) " +
    "or SMS_ALLOW_DIRECT_VITEST=1 if you intentionally bypass. " +
    "Refer to docs/plans/UNIFIED_WORK_PLAN.md and Copilot instructions."
);
process.exit(1);
