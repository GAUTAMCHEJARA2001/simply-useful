const getApiUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.includes('simply-useful-backend.onrender.com')) {
    envUrl = 'https://api.simply-useful.run.place/api/v1';
  }
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  if (hostname.includes('vercel.app')) {
    return 'https://api.simply-useful.run.place/api/v1';
  }
  return `http://${hostname}:4000/api/v1`;
};

const config = {
  apiUrl: getApiUrl(),
  appName: import.meta.env.VITE_APP_NAME || 'KAMLA OTS',
  isDev: import.meta.env.DEV,
};

export default config;
