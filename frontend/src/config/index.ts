const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  return `http://${hostname}:4000/api/v1`;
};

const config = {
  apiUrl: getApiUrl(),
  appName: import.meta.env.VITE_APP_NAME || 'Simply Useful',
  isDev: import.meta.env.DEV,
};

export default config;
