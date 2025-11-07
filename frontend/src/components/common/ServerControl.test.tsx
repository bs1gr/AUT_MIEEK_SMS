import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ServerControl from './ServerControl';

// Mock useLanguage to avoid i18n dependency
vi.mock('../../LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k })
}));
// Mock API call
vi.mock('../../api/api', () => ({
  getHealthStatus: vi.fn(() => Promise.resolve({ status: 'ok' }))
}));

describe('ServerControl', () => {
  it('renders restart button', async () => {
    await act(async () => {
      render(<ServerControl />);
    });
    // The restart button label uses the translation key 'controlPanel.restart'
    expect(screen.getByText('controlPanel.restart')).toBeDefined();
  });
});
