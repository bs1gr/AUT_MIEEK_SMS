import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { preflightAPI } from '../../api/api';

/**
 * BackendStatusBanner - Lightweight connectivity monitor
 * 
 * Periodically checks backend availability using preflightAPI() and displays
 * a dismissible banner when the backend is unreachable. Automatically hides
 * on successful reconnection.
 * 
 * Features:
 * - Auto-check every 30s when connected, 10s when disconnected
 * - User dismissible (hides until next failure)
 * - i18n support for EN/EL
 * - Minimal UI footprint (top banner, slide animation)
 */
const BackendStatusBanner = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkBackendHealth = useCallback(async () => {
    try {
      await preflightAPI();
      setStatus('connected');
      // If was disconnected and now connected, briefly show success then hide
      if (status === 'disconnected' && !dismissed) {
        setVisible(true);
        setTimeout(() => {
          setVisible(false);
          setDismissed(false); // Reset dismiss flag on successful reconnect
        }, 3000);
      } else if (status === 'connected') {
        setVisible(false);
        setDismissed(false);
      }
    } catch (error) {
      setStatus('disconnected');
      if (!dismissed) {
        setVisible(true);
      }
    }
  }, [status, dismissed]);

  useEffect(() => {
    // Initial check on mount
    checkBackendHealth();

    // Periodic health checks: faster when disconnected
    const interval = status === 'disconnected' ? 10000 : 30000;
    const timer = setInterval(checkBackendHealth, interval);

    return () => clearInterval(timer);
  }, [status, checkBackendHealth]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible) {
    return null;
  }

  const isDisconnected = status === 'disconnected';
  const isReconnected = status === 'connected';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`flex items-center justify-between px-4 py-3 shadow-lg ${
          isDisconnected
            ? 'bg-red-600 text-white'
            : 'bg-green-600 text-white'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isDisconnected && (
            <svg
              className="h-5 w-5 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          {isReconnected && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <div>
            <p className="font-medium">
              {isDisconnected && t('common.backendUnavailable')}
              {isReconnected && t('common.backendConnected')}
            </p>
            {isDisconnected && (
              <p className="text-sm opacity-90">
                {t('common.backendReconnecting')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="ml-4 inline-flex rounded-md p-1.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          aria-label="Dismiss"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BackendStatusBanner;
