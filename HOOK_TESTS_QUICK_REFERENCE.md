# Frontend Hook Tests — Quick Reference

## Files & focus areas
- `useErrorRecovery.test.ts` — backoff/none/immediate strategies, retry counts, cleanup, callbacks
- `useApiWithRecovery.test.tsx` — React Query query/mutation flows with recovery options and backoff
- `useAutosave.test.ts` — debounce timing, pending/saving states, saveNow, callbacks, dependency tracking
- `usePerformanceMonitor.test.ts` — render timing thresholds, warnings, analytics, PerformanceObserver paths
- `useVirtualScroll.test.ts` — virtualizer config, refs, scroll helpers, large/small list edge cases

All tests live in `frontend/src/hooks/`.

## Run commands
- All frontend tests: `npm run test -- --run`
- Hook-only filter: `npm run test -- --run src/hooks/`
- Single suite (examples):
  - `npm run test -- useApiWithRecovery.test.tsx`
  - `npm run test -- useAutosave.test.ts`
  - `npm run test -- usePerformanceMonitor.test.ts`

## Tooling & patterns
- Vitest + @testing-library/react hooks utilities
- Fake timers for backoff/debounce paths
- Mocks for React Query and react-virtual where needed

## Notes
- If hook timing changes, adjust fake timers in the suites to match new backoff/debounce values.
- Use watch mode (`npm run test -- --watch`) for rapid iteration on a single suite.
