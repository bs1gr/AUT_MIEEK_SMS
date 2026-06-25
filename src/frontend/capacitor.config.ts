import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cy.mieek.sms',
  appName: 'SMS — ΜΙΕΕΚ',
  webDir: 'dist',
  server: {
    // App is served from https://localhost but backend connections use plain HTTP
    // (Tailscale and LAN). Mixed content and cleartext must be allowed here.
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
