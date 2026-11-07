'use client';

/*
 * React Bits — LineSidebar
 * Upstream: https://github.com/DavidHDev/react-bits/blob/4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4/src/content/Components/LineSidebar/LineSidebar.jsx
 * License: MIT + Commons Clause License Condition v1.0, Copyright (c) 2026 David Haz
 * See ./NOTICE.md for the adaptation notes kept in this repository.
 *
 * Adaptation: typed props; semantic <a> links and a controlled `active` prop
 * (both already present in the hand-off source). Item centres are measured with
 * getBoundingClientRect relative to the list instead of offsetTop, so pointer
 * proximity keeps working when the sidebar lives in its own scroll container.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';

import './LineSidebar.css';

const FALLOFF_CURVES = {
  linear: (p: number) => p,
  smooth: (p: number) => p * p * (3 - 2 * p),
  sharp: (p: number) => p * p * p,
} as const;

type Falloff = keyof typeof FALLOFF_CURVES;

export interface LineSidebarItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  title?: string;
}

type RawItem = string | LineSidebarItem;

interface NormalizedItem {
  label: string;
  href?: string;
  icon: ReactNode;
  title?: string;
  key: string;
}

const DEFAULT_ITEMS: RawItem[] = [
  'Overview',
  'Components',
  'Animations',
  'Backgrounds',
  'Showcase',
  'Playground',
  'Templates',
  'Changelog',
  'Community',
  'Resources',
  'Documentation',
  'Support',
];

const normalizeItem = (item: RawItem, index: number): NormalizedItem => {
  if (typeof item === 'string') {
    return { label: item, href: undefined, icon: null, key: `${item}-${index}` };
  }
  return {
    label: item?.label ?? '',
    href: item?.href,
    icon: item?.icon ?? null,
    title: item?.title,
    key: `${item?.label ?? 'item'}-${index}`,
  };
};

export interface LineSidebarProps {
  items?: RawItem[];
  active?: number | null;
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: Falloff;
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  defaultActive?: number | null;
  onItemClick?: (index: number, label: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

const LineSidebar = ({
  items = DEFAULT_ITEMS,
  active = null,
  accentColor = '#A855F7',
  textColor = '#c4c4c4',
  markerColor = '#6c6c6c',
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = 'smooth',
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  onItemClick,
  className = '',
}: LineSidebarProps) => {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const centersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const activeRef = useRef<number | null>(defaultActive);
  const smoothingRef = useRef(smoothing);
  const [activeIndex, setActiveIndex] = useState<number | null>(defaultActive);

  activeRef.current = activeIndex;
  smoothingRef.current = smoothing;

  useEffect(() => {
    if (active !== null && active !== undefined) setActiveIndex(active);
  }, [active]);

  // Cache item centres relative to the list; they stay valid while the parent
  // scroll container scrolls because both measurements come from the same frame.
  const measureCenters = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listTop = list.getBoundingClientRect().top;
    centersRef.current = itemRefs.current.map((el) =>
      el ? el.getBoundingClientRect().top - listTop + el.offsetHeight / 2 : 0
    );
  }, []);

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  const runFrame = useCallback(function frame(now: number) {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothingRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let moving = false;
    const items = itemRefs.current;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (!el) continue;
      const target = Math.max(targetsRef.current[i] || 0, activeRef.current === i ? 1 : 0);
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty('--effect', value.toFixed(4));
      if (!settled) moving = true;
    }

    rafRef.current = moving ? requestAnimationFrame(frame) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    (e: MouseEvent<HTMLUListElement>) => {
      const list = listRef.current;
      if (!list) return;
      if (centersRef.current.length !== itemRefs.current.length) measureCenters();
      const pointerY = e.clientY - list.getBoundingClientRect().top;
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
      const centers = centersRef.current;
      for (let i = 0; i < centers.length; i++) {
        const distance = Math.abs(pointerY - centers[i]);
        targetsRef.current[i] =
          proximityRadius > 0 ? ease(Math.max(0, 1 - distance / proximityRadius)) : 0;
      }
      startLoop();
    },
    [falloff, proximityRadius, startLoop, measureCenters]
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  const handleClick = useCallback(
    (index: number, label: string, event: MouseEvent<HTMLAnchorElement>) => {
      setActiveIndex(index);
      onItemClick?.(index, label, event);
    },
    [onItemClick]
  );

  useEffect(() => {
    measureCenters();
    startLoop();
  }, [activeIndex, items.length, startLoop, measureCenters]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measureCenters());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measureCenters]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    []
  );

  return (
    <nav
      className={`line-sidebar${showMarker ? ' line-sidebar--markers' : ''}${scaleTick ? ' line-sidebar--scale-tick' : ''}${className ? ` ${className}` : ''}`}
      style={
        {
          '--accent-color': accentColor,
          '--text-color': textColor,
          '--marker-color': markerColor,
          '--marker-length': `${markerLength}px`,
          '--marker-gap': `${markerGap}px`,
          '--tick-scale': tickScale,
          '--max-shift': `${maxShift}px`,
          '--item-gap': `${itemGap}px`,
          '--font-size': `${fontSize}rem`,
          '--smoothing': `${smoothing}ms`,
        } as CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((rawItem, index) => {
          const item = normalizeItem(rawItem, index);
          const isActive = activeIndex === index;
          return (
            <li
              key={item.key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="line-sidebar__item"
            >
              {showMarker && <span className="line-sidebar__marker" aria-hidden="true" />}
              <a
                className="line-sidebar__link"
                href={item.href}
                title={item.title}
                aria-current={isActive ? 'location' : undefined}
                onClick={(event) => handleClick(index, item.label, event)}
              >
                <span className="line-sidebar__label">
                  {item.icon && (
                    <span className="line-sidebar__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {showIndex && (
                    <span className="line-sidebar__index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                  <span className="line-sidebar__text">{item.label}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default LineSidebar;
