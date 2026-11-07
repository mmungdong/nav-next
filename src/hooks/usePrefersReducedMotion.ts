import { useEffect, useState } from 'react';

// SSR-safe: the server and the first client render both report false, then the
// media query is read after mount.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}
