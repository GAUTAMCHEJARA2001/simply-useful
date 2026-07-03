import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const useApiHealth = () => {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      try {
        const start = Date.now();
        await api.get('/health', { timeout: 2000 });
        return { online: true, latency: Date.now() - start };
      } catch (err) {
        return { online: false, latency: -1 };
      }
    },
    refetchInterval: 60000,           // Check every 60s (was 10s — too aggressive for free tier)
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
    retry: false,
  });
};
