// État conservé le temps de la session (filtres, onglet…). Tolère un stockage indisponible.
import { useEffect, useState } from 'react';

export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  }, [key, value]);
  return [value, setValue] as const;
}
