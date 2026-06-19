import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cy.mieek.sms',
  appName: 'SMS — ΜΙΕΕΚ',
  webDir: 'dist',
  server: {
    // https is required for production/Play Store builds.
    // The API URL is controlled via VITE_API_URL at build time.
    androidScheme: 'https',
    // Allow cleartext traffic to local network IPs (Tailscale) during development.
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
