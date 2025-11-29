/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal TypeScript declaration for the legacy JS API client
// This file provides wide 'any' typings to unblock TypeScript checks during
// the pre-commit/validation process. More accurate types should be added
// incrementally in follow-up work.

declare module '@/api/api' {
  export const CONTROL_API_BASE: string;
  export const apiClient: any;
  export function attachAuthHeader(config: any): any;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;

  export const studentsAPI: any;
  export const coursesAPI: any;
  export const attendanceAPI: any;
  export const gradesAPI: any;
  export const sessionAPI: any;
  export const analyticsAPI: any;
  export const authAPI: any;
  export const dashboardAPI: any;
  export const filesAPI: any;
  export const coursesEnrollmentAPI: any;
  export const sessionAPI: any;
  export const authAPI: any;
  export const dashboardAPI: any;
  export const filesAPI: any;
  export const coursesEnrollmentAPI: any;

  const _default: any;
  export default _default;
}

// Also allow direct relative import paths (js files) that reference the file
declare module '../api.js' {
  export const CONTROL_API_BASE: string;
  export const apiClient: any;
  export function attachAuthHeader(config: any): any;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: any;
  export const coursesAPI: any;
  export const attendanceAPI: any;
  export const gradesAPI: any;
  export const sessionAPI: any;
  export const analyticsAPI: any;
  export const authAPI: any;
  export const dashboardAPI: any;
  export const filesAPI: any;
  export const coursesEnrollmentAPI: any;
  const _default: any;
  export default _default;
}

// Allow both absolute and relative imports to match the same API surface
declare module '*api/api' {
  export const CONTROL_API_BASE: string;
  export const apiClient: any;
  export function attachAuthHeader(config: any): any;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: any;
  export const coursesAPI: any;
  export const attendanceAPI: any;
  export const gradesAPI: any;
  export const sessionAPI: any;
  export const analyticsAPI: any;
  export const authAPI: any;
  export const dashboardAPI: any;
  export const filesAPI: any;
  export const coursesEnrollmentAPI: any;
  const _default: any;
  export default _default;
}

declare module '*api.js' {
  export const CONTROL_API_BASE: string;
  export const apiClient: any;
  export function attachAuthHeader(config: any): any;
  export function preflightAPI(): Promise<string>;
  export function __test_forceOriginalBase(url: string): void;
  export const studentsAPI: any;
  export const coursesAPI: any;
  export const attendanceAPI: any;
  export const gradesAPI: any;
  export const sessionAPI: any;
  export const analyticsAPI: any;
  export const authAPI: any;
  export const dashboardAPI: any;
  export const filesAPI: any;
  export const coursesEnrollmentAPI: any;
  const _default: any;
  export default _default;
}
// NOTE: This file purposefully uses permissive `any` typings to unblock
// TypeScript checks during the validation workflow. Follow-up work should
// replace these with precise interfaces and types.
