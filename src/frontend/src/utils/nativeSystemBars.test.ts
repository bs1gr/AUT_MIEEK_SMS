import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  setStyle: vi.fn(),
  setBackgroundColor: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  SystemBars: { setStyle: mocks.setStyle },
  SystemBarsStyle: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
  registerPlugin: vi.fn(() => ({ setBackgroundColor: mocks.setBackgroundColor })),
}));

import { syncSystemBarsWithDocument, barChromeFor } from './nativeSystemBars';

const rootWith = (className: string, appearance: string | null) => {
  const el = document.createElement('html');
  el.className = className;
  if (appearance) el.setAttribute('data-appearance', appearance);
  return el;
};

describe('nativeSystemBars', () => {
  beforeEach(() => {
    mocks.setStyle.mockResolvedValue(undefined);
    mocks.setBackgroundColor.mockResolvedValue(undefined);
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-appearance');
  });

  it('paints a dark strip with light icons for the dark theme (theme wins over appearance)', () => {
    expect(barChromeFor(rootWith('dark', null))).toEqual({ background: '#1a202c', style: 'DARK' });
    expect(barChromeFor(rootWith('dark', 'mieek'))).toEqual({ background: '#1a202c', style: 'DARK' });
  });

  it('uses each dark appearance surface colour with light icons', () => {
    expect(barChromeFor(rootWith('', 'mieek-dark'))).toEqual({ background: '#0a0a0a', style: 'DARK' });
    expect(barChromeFor(rootWith('', 'modern-dark'))).toEqual({ background: '#0f172a', style: 'DARK' });
  });

  it('paints a white strip with dark icons for every light chrome', () => {
    for (const root of [rootWith('', null), rootWith('relaxing', null), rootWith('fancy', 'gradient'), rootWith('', 'mieek'), rootWith('', 'light-professional')]) {
      expect(barChromeFor(root)).toEqual({ background: '#ffffff', style: 'LIGHT' });
    }
  });

  it('does nothing on the web', () => {
    mocks.isNativePlatform.mockReturnValue(false);
    document.documentElement.classList.add('dark');
    syncSystemBarsWithDocument();
    expect(mocks.setStyle).not.toHaveBeenCalled();
    expect(mocks.setBackgroundColor).not.toHaveBeenCalled();
  });

  const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

  it('reads the live document on a native platform: style first, then the colour', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    const order: string[] = [];
    mocks.setStyle.mockImplementation(async () => { order.push('style'); });
    mocks.setBackgroundColor.mockImplementation(async () => { order.push('color'); });

    document.documentElement.classList.add('dark');
    syncSystemBarsWithDocument();
    await flush();
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: 'DARK' });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: '#1a202c' });
    expect(order).toEqual(['style', 'color']);

    document.documentElement.classList.remove('dark');
    syncSystemBarsWithDocument();
    await flush();
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: '#ffffff' });

    document.documentElement.setAttribute('data-appearance', 'mieek-dark');
    syncSystemBarsWithDocument();
    await flush();
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: 'DARK' });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: '#0a0a0a' });
  });

  it('still applies the colour when the style call fails, and swallows both failures', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.setStyle.mockRejectedValue(new Error('no bridge'));
    mocks.setBackgroundColor.mockRejectedValue(new Error('not implemented'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => syncSystemBarsWithDocument()).not.toThrow();
    await flush();
    expect(mocks.setBackgroundColor).toHaveBeenCalledWith({ color: '#ffffff' });
    expect(warn).toHaveBeenCalledWith('[SystemBars] Failed to set bar style:', expect.any(Error));
    expect(warn).toHaveBeenCalledWith('[SystemBars] Failed to set window background:', expect.any(Error));
  });
});
