import { useEffect, useState } from 'react';

/** Devuelve `value` tras `delay` ms sin cambios: evita una petición por tecla en los buscadores. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
