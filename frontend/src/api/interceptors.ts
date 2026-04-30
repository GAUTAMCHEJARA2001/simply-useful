import { api } from './client';

// ✅ REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `🚀 ${config.method?.toUpperCase()} → ${config.baseURL}${config.url}`
    );

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    console.error('❌ API ERROR:', error.response?.data || error.message);

    if (status === 401) {
      console.warn('🔐 Session expired → Hard Reset');

      localStorage.clear(); // Nuclear option for a clean state

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }



    if (status === 404) {
      console.error('🚨 API ROUTE NOT FOUND:', error.config?.url);
    }

    return Promise.reject(error);
  }
);
