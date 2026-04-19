import config from '../config';

/**
 * ELITE API CLIENT (MISSION-CRITICAL RESILIENCE)
 * Features: 
 * - Dual-Token Storage (Access + Refresh)
 * - Transparent 401 Interceptor (Auto-Refresh + Retry)
 * - Exponential Backoff & 10s Timeout
 * - Atomic Refresh Synchronization
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
}

export const API_BASE_URL = config.apiUrl;

// TOKEN MANAGEMENT
export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// ATOMIC REFRESH LOCK
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const fetchWithRetry = async (
  url: string, 
  options: RequestInit, 
  retries = 2, 
  delay = 500
): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status >= 500 && retries > 0) {
      throw new Error('Server error');
    }
    return res;
  } catch (err) {
    if (retries === 0) throw err;
    await wait(delay);
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
};

const apiClient = async <T = any>(
  endpoint: string,
  options: any = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const createConfig = (token: string | null): RequestInit => ({
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.data ? JSON.stringify(options.data) : undefined,
  });

  try {
    let res = await fetchWithRetry(url, createConfig(accessToken));
    clearTimeout(timeoutId);

    // 401 INTERCEPTOR (THE ELITE ROTATION LOOP)
    if (res.status === 401 && !options._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh(async (newToken: string) => {
            resolve(await apiClient(endpoint, { ...options, _retry: true }));
          });
        });
      }

      options._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return { success: false, data: null, message: 'Session expired' };
      }

      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        const refreshData = await refreshRes.json();
        
        if (refreshRes.ok && refreshData.success) {
          const { accessToken: newAccess, refreshToken: newRefresh } = refreshData.data;
          setTokens(newAccess, newRefresh);
          onTokenRefreshed(newAccess);
          isRefreshing = false;
          
          // Retry original request with new token
          return await apiClient(endpoint, options);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (e) {
        isRefreshing = false;
        clearTokens();
        window.location.href = '/login';
        return { success: false, data: null, message: 'Session expired' };
      }
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return { success: false, data: null, message: data?.message || 'API Error' };
    }

    return { 
      success: true, 
      data: data.data || data, 
      message: data.message || 'Success' 
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: error.name === 'AbortError' ? 'Timeout' : error.message || 'Network error',
    };
  }
};

export default apiClient;
