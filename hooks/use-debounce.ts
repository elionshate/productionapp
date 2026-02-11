import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns a debounced version of the provided value.
 * Updates only after `delay` ms of inactivity.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a guard flag and wrapper function that prevents
 * concurrent execution of an async handler (e.g., delete, clone).
 *
 * Usage:
 *   const [isProcessing, guard] = useAsyncGuard();
 *   <button disabled={isProcessing} onClick={guard(() => handleDelete(id))} />
 */
export function useAsyncGuard(): [boolean, (fn: () => Promise<void>) => () => void] {
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const guard = useCallback(
    (fn: () => Promise<void>) => () => {
      if (isProcessing) return;
      setIsProcessing(true);
      fn().finally(() => {
        if (mountedRef.current) setIsProcessing(false);
      });
    },
    [isProcessing],
  );

  return [isProcessing, guard];
}
