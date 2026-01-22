import { AxiosInstance } from 'axios';
import { getCsrfToken } from '../utils/csrf';

/**
 * Configures Axios interceptors for security and global error handling.
 * Adds CSRF token to state-changing requests.
 */
export const setupInterceptors = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    // Only add CSRF token for mutation methods
    const method = config.method?.toLowerCase() || 'get';
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const token = getCsrfToken();
      if (token) {
        config.headers['X-CSRF-TOKEN'] = token;
      }
    }
    return config;
  });
};
