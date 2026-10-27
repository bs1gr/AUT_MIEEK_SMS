/**
 * Make the Android system-bar strips part of the app's chrome.
 *
 * Capacitor pads the WebView below the status and navigation bars (no `viewport-fit=cover`,
 * plan todo 36). Those strips show the window/WebView background, which follows the *device*
 * night mode, and the bar icons follow it too. The app's look is independent of the device:
 * ThemeContext puts `.dark` on <html>, AppearanceThemeContext puts `data-appearance` there,
 * so "app dark + device light" showed a light strip with dark icons above a dark header.
 *
 * With targetSdk 36 Android enforces edge-to-edge and the core plugins have no bar colour API,
 * so the strips are repainted through the app's own `WindowChrome` plugin (window + WebView
 * background) and the icons through `SystemBars.setStyle`, both from the chrome the DOM shows.
 * The function reads the DOM instead of taking a theme argument so both providers can call it
 * in any order after they update <html>.
 */

import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';

interface WindowChromePlugin {
  setBackgroundColor(options: { color: string }): Promise<void>;
}

const WindowChrome = registerPlugin<WindowChromePlugin>('WindowChrome');

export interface BarChrome {
  /** Window + WebView background behind the padded strips (hex). */
  background: string;
  /** `SystemBarsStyle.Dark` = light icons for a dark background; `Light` = the reverse. */
  style: SystemBarsStyle;
}

const LIGHT_CHROME: BarChrome = { background: '#ffffff', style: SystemBarsStyle.Light };

/** Dark appearances (AppearanceThemeContext) and the surface colour each one paints <body> with. */
const DARK_APPEARANCE_BACKGROUNDS: Readonly<Record<string, string>> = {
  'mieek-dark': '#0a0a0a',
  'modern-dark': '#0f172a',
};

export function barChromeFor(root: Pick<HTMLElement, 'classList' | 'getAttribute'>): BarChrome {
  if (root.classList.contains('dark')) {
    return { background: '#1a202c', style: SystemBarsStyle.Dark }; // `.dark body` in index.css
  }
  const appearance = root.getAttribute('data-appearance') ?? '';
  const darkBackground = DARK_APPEARANCE_BACKGROUNDS[appearance];
  if (darkBackground) {
    return { background: darkBackground, style: SystemBarsStyle.Dark };
  }
  return LIGHT_CHROME;
}

/**
 * No-op on the web; errors are logged, never thrown (bar chrome must not break the UI).
 * Order matters: Capacitor's `SystemBars.setStyle` resets the decor background to the theme's
 * `windowBackground` (which follows the device mode) every time it runs, so the colour is
 * applied after the style has settled.
 */
export function syncSystemBarsWithDocument(): void {
  if (typeof document === 'undefined' || !Capacitor.isNativePlatform()) return;
  const chrome = barChromeFor(document.documentElement);
  void SystemBars.setStyle({ style: chrome.style })
    .catch((error: unknown) => {
      console.warn('[SystemBars] Failed to set bar style:', error);
    })
    .then(() => WindowChrome.setBackgroundColor({ color: chrome.background }))
    .catch((error: unknown) => {
      console.warn('[SystemBars] Failed to set window background:', error);
    });
}
