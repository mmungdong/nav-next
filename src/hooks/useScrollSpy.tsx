import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveActiveId, scrollTopFor, pickActiveSection } from '@/lib/navigation';
import { shouldReduceMotion } from '@/lib/utils';

export const useScrollSpy = (ids: string[], offset: number = 100) => {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');

  // Ignore scroll-driven updates while a click-triggered smooth scroll is running.
  const clickLockUntil = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      if (performance.now() < clickLockUntil.current) return;
      const sections = ids
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          // viewport-relative top: the offset line is measured from the viewport
          return { id, top: element.getBoundingClientRect().top };
        })
        .filter((section): section is { id: string; top: number } => section !== null);

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const next = pickActiveSection(sections, offset, atBottom);
      setActiveId((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const initial = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(initial);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [ids, offset]);

  const scrollToSection = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (!element) return;

      const reduce = shouldReduceMotion();
      clickLockUntil.current = performance.now() + (reduce ? 250 : 1000);
      setActiveId(id);

      window.scrollTo({
        top: scrollTopFor(element.getBoundingClientRect().top + window.scrollY, offset),
        behavior: reduce ? 'auto' : 'smooth',
      });
    },
    [offset]
  );

  // Derive a valid id during render so a filtered-out section never lingers in
  // the navigation before the next scroll event arrives.
  return { activeId: resolveActiveId(activeId, ids), scrollToSection };
};
