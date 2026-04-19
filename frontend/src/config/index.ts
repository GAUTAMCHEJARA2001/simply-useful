const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api',
  appName: import.meta.env.VITE_APP_NAME || 'Simply Useful',
  isDev: import.meta.env.DEV,
};

export default config;
