import { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppearanceThemeProvider, useAppearanceTheme } from './AppearanceThemeContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppearanceThemeProvider>{children}</AppearanceThemeProvider>
);

describe('AppearanceThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-appearance');
    document.body.removeAttribute('data-appearance');
  });

  it('exposes default theme and updates DOM attributes when changed', () => {
    const { result } = renderHook(() => useAppearanceTheme(), { wrapper });

    expect(result.current.appearanceTheme).toBe('default');
    expect(document.documentElement.getAttribute('data-appearance')).toBeNull();

    act(() => {
      result.current.setAppearanceTheme('gradient');
    });

    expect(result.current.appearanceTheme).toBe('gradient');
    expect(document.documentElement.getAttribute('data-appearance')).toBe('gradient');
    expect(document.body.getAttribute('data-appearance')).toBe('gradient');
  });

  it('persists the theme selection to localStorage', () => {
    const { result } = renderHook(() => useAppearanceTheme(), { wrapper });

    act(() => {
      result.current.setAppearanceTheme('modern-dark');
    });

    expect(window.localStorage.getItem('sms.appearance.theme')).toBe('modern-dark');
    expect(window.localStorage.getItem('sms.operations.theme')).toBe('modern-dark');
  });
});
