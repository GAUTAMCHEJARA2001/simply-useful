import { useState, useCallback, useEffect, useRef } from 'react';
import { ApiResponse } from '../api/client';

/**
 * ELITE API HOOK
 * Handles: Loading, Error, Data states, and Memory Leak protection.
 */
export function useApi<T = any>(apiFunc: (...args: any[]) => Promise<ApiResponse<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: any[]) => {
    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await apiFunc(...args);
      
      if (isMounted.current) {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
      }
      return result;
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'An unexpected error occurred');
      }
      return { success: false, data: null, message: err.message };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [apiFunc]);

  return { data, loading, error, execute, setData };
}
