/**
 * Hand a generated file (PDF, Excel, CSV, JSON, ZIP, ICS) to the user.
 *
 * Web: the usual object-URL + `<a download>` click.
 *
 * Android (Capacitor): the WebView never hands `blob:` URLs to the system
 * download manager, so the anchor click silently does nothing — every export
 * in the app was a no-op in the APK until this helper existed. Instead the
 * bytes are written to the app's cache directory and offered through the
 * Android share sheet, which lets the user open the file in a viewer or save
 * it to Files/Drive. The user dismissing the sheet is not an error.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.onload = () => {
      // result is "data:<mime>;base64,<payload>" — Filesystem wants the payload only
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function downloadViaAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function shareViaNative(blob: Blob, filename: string): Promise<void> {
  const data = await blobToBase64(blob);
  const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  try {
    await Share.share({ title: filename, files: [uri] });
  } catch (err) {
    // Android reports a dismissed sheet as a rejection ("Share canceled").
    if (err instanceof Error && /cancel/i.test(err.message)) return;
    throw err;
  }
}

/**
 * Save or share `blob` under `filename`. Resolves once the browser download
 * has been triggered (web) or the share sheet has closed (native).
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareViaNative(blob, filename);
    return;
  }
  downloadViaAnchor(blob, filename);
}

/** Convenience for callers that build the file content in memory. */
export function downloadText(content: string, filename: string, mimeType: string): Promise<void> {
  return downloadBlob(new Blob([content], { type: mimeType }), filename);
}
