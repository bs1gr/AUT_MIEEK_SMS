/**
 * Type declaration file for BackendStatusBanner.jsx
 * 
 * This allows TypeScript files to import the BackendStatusBanner component
 * without type errors.
 */

import { FC } from 'react';

/**
 * BackendStatusBanner - Lightweight connectivity monitor
 * 
 * Periodically checks backend availability and displays a dismissible banner
 * when the backend is unreachable. Automatically hides on successful reconnection.
 */
declare const BackendStatusBanner: FC;

export default BackendStatusBanner;
