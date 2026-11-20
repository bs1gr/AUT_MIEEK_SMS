/**
 * Saved sign-ins in the Android app, through the app's own `SavedLogin` plugin
 * (android/.../SavedLoginPlugin.java, Android's Credential Manager). Everywhere else (browsers,
 * SMS Lite, tests) both calls do nothing: a browser offers its own password saving for the form.
 */
import { registerPlugin } from '@capacitor/core';
import { usesNativeSession } from '@/services/nativeSession';

export type SavedLoginResult =
  | { found: true; id: string; password: string }
  | { found: false; reason?: 'cancelled' | 'none' | 'unavailable'; detail?: string };

interface SavedLoginPlugin {
  get(): Promise<SavedLoginResult>;
  save(options: { id: string; password: string }): Promise<{ saved: boolean; reason?: string }>;
}

const SavedLogin = registerPlugin<SavedLoginPlugin>('SavedLogin');

/** Shows the phone's sheet of saved sign-ins; resolves {found:false} when there is none or it is dismissed. */
export async function pickSavedLogin(): Promise<SavedLoginResult> {
  if (!usesNativeSession()) return { found: false, reason: 'unavailable' };
  try {
    const result = await SavedLogin.get();
    if (result && result.found && result.id && result.password) return result;
    return result && !result.found ? result : { found: false, reason: 'none' };
  } catch {
    return { found: false, reason: 'unavailable' };
  }
}

/** Asks the phone's password manager to keep a sign-in the server just accepted. Never throws. */
export async function offerToSaveLogin(id: string, password: string): Promise<void> {
  if (!usesNativeSession() || !id || !password) return;
  try {
    await SavedLogin.save({ id, password });
  } catch {
    // the page goes on either way
  }
}

// One sheet per app run on its own: after the owner dismissed it, or right after a sign-out
// (they may want another account), the page waits for the button instead.
let autoOfferDone = false;

export function shouldAutoOfferSavedLogin(): boolean {
  return usesNativeSession() && !autoOfferDone;
}

export function markAutoOfferDone(): void {
  autoOfferDone = true;
}

/** For tests. */
export function resetSavedLoginState(): void {
  autoOfferDone = false;
}
