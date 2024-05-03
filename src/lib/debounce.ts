import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(
  defaultValue: T,
  delay: number
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [debouncedValue, setDebouncedValue] = useState<T>(defaultValue);
  const [value, setValue] = useState<T>(defaultValue);
  const timeouts = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeouts.current) {
      clearTimeout(timeouts.current);
    }

    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    timeouts.current = timeout;
  }, [value]);

  return [debouncedValue, setValue];
}
