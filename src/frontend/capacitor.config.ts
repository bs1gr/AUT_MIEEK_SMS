import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cy.mieek.sms',
  appName: 'SMS — ΜΙΕΕΚ',
  webDir: 'dist',
  server: {
    // In production APK, set androidScheme to https for security.
    // The API URL is controlled via VITE_API_URL at build time.
    androidScheme: 'http',
    // Allow cleartext traffic to local network IPs during development.
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
