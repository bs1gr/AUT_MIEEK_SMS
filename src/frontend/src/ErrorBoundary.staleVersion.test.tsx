import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from './ErrorBoundary';
import { SectionErrorBoundary } from './components/ErrorBoundaries';
import * as recovery from './utils/chunkLoadRecovery';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// What the browser reports when a tab that was open during an update asks for a page file of
// the previous build. React.lazy hands it to the nearest error boundary; the window-level
// handlers in main.tsx never see it.
const STALE = 'Failed to fetch dynamically imported module: https://example.test/assets/js/AttendancePage-OLD.js';

function Boom({ message }: { message: string }): never {
  throw new TypeError(message);
}

describe('error boundaries and a page file from a previous build', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reloads to pick up the new version', () => {
    const recover = vi.spyOn(recovery, 'recoverFromChunkLoadError').mockReturnValue(true);

    render(
      <ErrorBoundary boundaryName="test">
        <Boom message={STALE} />
      </ErrorBoundary>,
    );

    expect(recover).toHaveBeenCalledTimes(1);
    expect((recover.mock.calls[0][0] as Error).message).toBe(STALE);
  });

  it('says a new version is available and offers Reload when the automatic reload is held back', () => {
    vi.spyOn(recovery, 'recoverFromChunkLoadError').mockReturnValue(false); // inside the cooldown

    render(
      <ErrorBoundary boundaryName="test">
        <Boom message={STALE} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'newVersionTitle' })).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent('newVersionMessage');
    expect(screen.getByRole('button', { name: 'newVersionReload' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'unknown' })).not.toBeInTheDocument();
  });

  it('keeps the ordinary error screen for any other error', () => {
    const recover = vi.spyOn(recovery, 'recoverFromChunkLoadError');

    render(
      <ErrorBoundary boundaryName="test">
        <Boom message="Cannot read properties of undefined" />
      </ErrorBoundary>,
    );

    expect(recover).toHaveReturnedWith(false);
    expect(screen.getByRole('heading', { name: 'unknown' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'newVersionReload' })).not.toBeInTheDocument();
  });

  it('a section boundary reloads too', () => {
    const recover = vi.spyOn(recovery, 'recoverFromChunkLoadError').mockReturnValue(true);

    render(
      <SectionErrorBoundary section="test">
        <Boom message={STALE} />
      </SectionErrorBoundary>,
    );

    expect(recover).toHaveBeenCalledTimes(1);
  });
});
