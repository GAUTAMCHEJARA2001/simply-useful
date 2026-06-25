import { api, setTokens, clearTokens } from './client';
import { normalizeApiError } from './apiError';
import { getRouteHealCandidates, healApiPath } from './routeHealing';

const IS_DEV = import.meta.env.DEV;

/**
 * Track whether a token refresh is already in-flight so
 * concurrent 401s don't fire multiple refresh calls.
 */
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const originalUrl = config.url;
    config.url = healApiPath(config.url);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const warehouseId = localStorage.getItem('activeWarehouseId');
    if (warehouseId) {
      const hasHeader = config.headers.has ? config.headers.has('X-Warehouse-ID') : !!config.headers['X-Warehouse-ID'];
      if (!hasHeader) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('X-Warehouse-ID', warehouseId);
        } else {
          config.headers['X-Warehouse-ID'] = warehouseId;
        }
      }
    }

    if (IS_DEV) {
      if (originalUrl !== config.url) {
        console.warn(`Route healed: ${originalUrl} -> ${config.url}`);
      }
      console.log(`${config.method?.toUpperCase()} -> ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR (with auto-refresh) ────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // ── Route-healing retry on 404 ──
    if (status === 404 && !originalRequest.__routeHealRetried) {
      const [candidate] = getRouteHealCandidates(originalRequest);
      if (candidate) {
        originalRequest.__routeHealRetried = true;
        originalRequest.url = candidate;
        if (IS_DEV) console.warn(`Retrying healed route -> ${candidate}`);
        return api.request(originalRequest);
      }
    }

    // ── Auto-refresh on 401 ──
    // If we get a 401 and this is NOT a refresh or login request itself,
    // try to silently refresh the token and retry the original request.
    if (status === 401 && !originalRequest.__isRetryAfterRefresh) {
      // Don't try to refresh the refresh-token endpoint itself
      const url = originalRequest.url || '';
      if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
        // Can't refresh — force logout
        forceLogout();
        return Promise.reject(normalizeApiError(error));
      }

      if (isRefreshing) {
        // Another refresh is in-flight; queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest.__isRetryAfterRefresh = true;
            return api.request(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const res = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data?.data || res.data || {};

        if (!accessToken) {
          throw new Error('Refresh response missing accessToken');
        }

        // Save new tokens
        setTokens(accessToken, newRefreshToken || refreshToken);

        // Notify queued requests
        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        originalRequest.__isRetryAfterRefresh = true;
        return api.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(normalizeApiError(error));
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 Forbidden — just log out ──
    if (status === 403) {
      if (IS_DEV) console.warn('Access forbidden -> redirecting to login');
      forceLogout();
    }

    const normalizedError = normalizeApiError(error);

    if (IS_DEV) {
      console.error('API ERROR:', {
        url: normalizedError.url,
        method: normalizedError.method,
        status: normalizedError.status,
        kind: normalizedError.kind,
        retryable: normalizedError.retryable,
        message: normalizedError.message,
        data: normalizedError.data,
      });
    }

    return Promise.reject(normalizedError);
  }
);

/**
 * Force-logout: clear all auth state and redirect to login.
 * Only redirects if not already on the login page.
 */
function forceLogout() {
  clearTokens();
  localStorage.removeItem('app_user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
