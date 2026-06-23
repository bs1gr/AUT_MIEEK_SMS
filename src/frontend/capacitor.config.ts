import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cy.mieek.sms',
  appName: 'SMS — ΜΙΕΕΚ',
  webDir: 'dist',
  server: {
    // HTTPS required for production. HTTP exceptions are handled per-domain
    // in android/app/src/main/res/xml/network_security_config.xml.
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
