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
    refetchInterval: 10000, // Check every 10s
    retry: false,
  });
};
