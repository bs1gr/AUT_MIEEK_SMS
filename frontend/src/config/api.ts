// API base URL configuration for all environments
export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? '/api/v1'  // Production: assume same origin
    : 'http://localhost:8000/api/v1'  // Development: explicit
  );
