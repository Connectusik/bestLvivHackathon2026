import { useState, useEffect, useCallback, type SetStateAction } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const setStoredValue = useCallback((action: SetStateAction<T>) => {
    setValue(action);
  }, []);

  return [value, setStoredValue] as const;
}
