/**
 * Extracts the CSRF token from the document cookies.
 * This is used to prevent Cross-Site Request Forgery attacks.
 *
 * @param cookieName - The name of the cookie containing the token (default: 'csrf_access_token')
 * @returns The CSRF token string or null if not found
 */
export const getCsrfToken = (cookieName: string = 'csrf_access_token'): string | null => {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + cookieName + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};
