/**
 * Persistent storage abstraction for Android (Capacitor) + web.
 *
 * On Android, localStorage can be wiped by the OS under memory pressure.
 * Capacitor Preferences (backed by Android SharedPreferences) survives this.
 *
 * Strategy:
 *  - init()     : preload known keys from Preferences into localStorage (called once at startup)
 *  - getItem()  : sync read from in-memory cache → falls back to localStorage
 *  - setItem()  : sync write to cache + localStorage; async write to Preferences
 *  - removeItem(): sync remove from cache + localStorage; async remove from Preferences
 *
 * Non-Capacitor (web/tests): init() is a no-op; reads/writes use localStorage only.
 */

import { Capacitor } from '@capacitor/core';

const KNOWN_KEYS = [
  'sms_server_url',
  'sms_server_type',
  'sms_user_v1',
  'sms_access_token',
  'access_token',
  'sms_grades_offline_queue_v1',
  'sms_attendance_offline_queue_v1',
  'sms_students_offline_update_queue_v1',
  'sms_local_mode',
] as const;

const cache: Record<string, string> = {};
let _prefsReady = false;

function _isCapacitor(): boolean {
  // Use isNativePlatform() so web/CI builds (where @capacitor/core still sets
  // window.Capacitor) don't trigger the 3-second Preferences init timeout.
  return Capacitor.isNativePlatform();
}

async function _getPrefs() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

/** Resolves after `ms` milliseconds. Used as a timeout race. */
function _timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`appStorage: timeout after ${ms}ms`)), ms));
}

/** Call once before ReactDOM.render(). No-op on non-Capacitor. */
export async function init(): Promise<void> {
  if (!_isCapacitor()) return;
  try {
    // Race against a 3-second timeout — if the native bridge is broken or
    // version-mismatched, we must not block React from mounting.
    const Preferences = await Promise.race([_getPrefs(), _timeout(3000)]);
    _prefsReady = true;
    await Promise.race([
      Promise.all(
        KNOWN_KEYS.map(async (key) => {
          const { value } = await Preferences.get({ key });
          if (value !== null) {
            cache[key] = value;
            try { localStorage.setItem(key, value); } catch { /* ignore */ }
          }
        }),
      ),
      _timeout(3000),
    ]);
  } catch {
    // Preferences unavailable or timed out — silently fall through to localStorage only
    _prefsReady = false;
  }
}

function _persistAsync(key: string, value: string | null): void {
  if (!_prefsReady) return;
  _getPrefs().then((Preferences) => {
    if (value === null) {
      Preferences.remove({ key }).catch(() => { /* ignore */ });
    } else {
      Preferences.set({ key, value }).catch(() => { /* ignore */ });
    }
  }).catch(() => { /* ignore */ });
}

export function getItem(key: string): string | null {
  if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key] ?? null;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setItem(key: string, value: string): void {
  cache[key] = value;
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
  _persistAsync(key, value);
}

export function removeItem(key: string): void {
  delete cache[key];
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  _persistAsync(key, null);
}
