import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Enterprise hook to synchronize local filter/tab state with URL query parameters.
 * Enables shareable URLs, bookmarking, and preservation of filters on browser back/forward navigation.
 * 
 * @example
 * const [status, setStatus] = useUrlFilterState('status', 'ALL');
 * const [search, setSearch] = useUrlFilterState('q', '');
 */
export function useUrlFilterState(
  key: string,
  defaultValue: string = ''
): [string, (newValue: string | ((prev: string) => string)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: string | ((prev: string) => string)) => {
      setSearchParams(
        prev => {
          const currentVal = prev.get(key) ?? defaultValue;
          const resolvedVal = typeof newValue === 'function' ? newValue(currentVal) : newValue;
          
          const next = new URLSearchParams(prev);
          if (resolvedVal && resolvedVal !== defaultValue) {
            next.set(key, resolvedVal);
          } else {
            next.delete(key);
          }
          return next;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setSearchParams]
  );

  return [value, setValue];
}

export default useUrlFilterState;
