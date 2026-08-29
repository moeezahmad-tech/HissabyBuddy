/**
 * Resilient API Client for Hissaby Buddy
 * Handles automatic retry when Render backend is waking up from cold sleep
 */

export const getApiUrl = (): string => {
  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000'
  ).replace(/\/$/, '');
};

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  token?: string;
}

export const fetchWithRetry = async (endpoint: string, options: FetchOptions = {}): Promise<Response> => {
  const { retries = 2, retryDelay = 2000, token, ...fetchOptions } = options;
  const baseUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(fetchOptions.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  fetchOptions.headers = headers;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      // If server returns 502/503 (Render booting up), trigger retry
      if ((response.status === 502 || response.status === 503) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
};
