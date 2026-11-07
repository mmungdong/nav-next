'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useNavStore } from '@/stores/navStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import {
  countAllSites,
  countMatchedSites,
  filterCategories,
  normalizeSearch,
  sortForDisplay,
} from '@/lib/siteSearch';
import { resolveActiveId } from '@/lib/navigation';
import AnimatedContent from '@/components/react-bits/AnimatedContent';
import LineSidebar from '@/components/react-bits/LineSidebar';
import PillNav from '@/components/react-bits/PillNav';
import SiteCard from '@/components/home/SiteCard';
import HomeSkeleton from '@/components/home/HomeSkeleton';

const sectionId = (id: number) => `category-${id}`;

export default function Home() {
  const { categories, loading, fetchCategories } = useNavStore();
  const [rawQuery, setRawQuery] = useState('');
  const query = useDebounce(rawQuery, 200);
  const [isMac, setIsMac] = useState(true);
  const composingRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pillWrapRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const isCompact = useMediaQuery('(max-width: 1023px)');
  const theme = resolvedTheme === 'light' ? 'light' : 'dark';

  const matches = useMemo(() => filterCategories(categories, query), [categories, query]);
  const searching = normalizeSearch(query).length > 0;
  const totalSites = useMemo(() => countAllSites(categories), [categories]);
  const matchedSites = useMemo(() => countMatchedSites(matches), [matches]);
  const sectionIds = useMemo(
    () => matches.map((match) => sectionId(match.category.id)),
    [matches]
  );

  const { activeId, scrollToSection } = useScrollSpy(sectionIds, isCompact ? 128 : 92);
  const effectiveActive = resolveActiveId(activeId, sectionIds);
  const activeIndex = sectionIds.indexOf(effectiveActive);
  const shortcut = isMac ? '⌘ K' : 'Ctrl K';

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent));
  }, []);

  // Category DOM nodes change with the filtered set; let ScrollTrigger recompute.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [matches, isCompact]);

  // Keep the current pill visible inside the horizontally scrolling row.
  useEffect(() => {
    if (!isCompact) return;
    const wrap = pillWrapRef.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const wrapRect = wrap.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const delta = activeRect.left - wrapRect.left - (wrapRect.width - activeRect.width) / 2;
    if (Math.abs(delta) > 2) wrap.scrollLeft += delta;
  }, [effectiveActive, isCompact, matches.length]);

  const clearSearch = () => {
    setRawQuery('');
    searchRef.current?.focus({ preventScroll: true });
  };

  const handleNavSelect = (id: string) => {
    scrollToSection(id);
  };

  const sidebarItems = matches.map((match) => ({
    label: match.category.title,
    title: match.category.title,
    href: `#${sectionId(match.category.id)}`,
  }));

  const pillItems = matches.map((match) => ({
    label: match.category.title,
    href: `#${sectionId(match.category.id)}`,
    ariaLabel: match.category.title,
  }));

  const mobileSearchFocus = () => {
    window.scrollTo(0, 0);
    searchRef.current?.focus({ preventScroll: true });
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="nx-layout">
      {matches.length > 0 && (
        <aside className="nx-sidebar" aria-label="站点分类导航">
          <div className="nx-side-head">
            <span>分类</span>
            <span>{String(matches.length).padStart(2, '0')}</span>
          </div>
          <LineSidebar
            items={sidebarItems}
            active={activeIndex >= 0 ? activeIndex : 0}
            accentColor="var(--nx-accent)"
            textColor="var(--nx-muted)"
            markerColor="var(--nx-border-strong)"
            markerLength={28}
            markerGap={8}
            maxShift={reduceMotion ? 0 : 7}
            proximityRadius={reduceMotion ? 0 : 90}
            falloff="smooth"
            itemGap={9}
            fontSize={0.84}
            smoothing={reduceMotion ? 1 : 90}
            showIndex
            showMarker
            onItemClick={(_index, _label, event) => {
              event.preventDefault();
              const href = sidebarItems[_index]?.href;
              if (href) handleNavSelect(href.slice(1));
            }}
          />
          <div className="nx-side-tip">
            <p className="nx-side-tip-title">快捷键</p>
            <div className="nx-shortcut">
              <span>搜索</span>
              <kbd className="nx-kbd">{shortcut}</kbd>
            </div>
            <div className="nx-shortcut">
              <span>清除</span>
              <kbd className="nx-kbd">Esc</kbd>
            </div>
          </div>
        </aside>
      )}

      <main id="main" className="nx-main nx-main-anchor">
        <section className="nx-hero" aria-labelledby="hero-title">
          <AnimatedContent
            trigger="mount"
            distance={0}
            scale={0.99}
            animateOpacity={false}
            duration={0.65}
          >
            <p className="nx-eyebrow">Personal start page</p>
            <h1 id="hero-title">今天，从哪里开始？</h1>
            <p className="nx-lede">
              <span>{totalSites}</span> 个站点，<span>{categories.length}</span> 个分类。输入关键词，即刻筛选。
            </p>
          </AnimatedContent>

          <div className="nx-search" data-filled={rawQuery.length > 0 ? 'true' : 'false'}>
            <span className="nx-search-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </span>
            <label className="nx-sr-only" htmlFor="home-search">
              搜索站点
            </label>
            <input
              ref={searchRef}
              id="home-search"
              className="nx-search-input"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="搜索站点、描述或域名"
              aria-controls="sections"
              aria-describedby="search-status"
              value={rawQuery}
              onChange={(event) => {
                if (!composingRef.current) setRawQuery(event.target.value);
              }}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(event) => {
                composingRef.current = false;
                setRawQuery(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                if (rawQuery) {
                  event.preventDefault();
                  clearSearch();
                } else {
                  searchRef.current?.blur();
                }
              }}
            />
            <span className="nx-search-hint" aria-hidden="true">
              {shortcut}
            </span>
            <button
              type="button"
              className="nx-search-clear"
              aria-label="清除搜索"
              onClick={clearSearch}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
            <div className="nx-search-status" id="search-status" hidden={!searching}>
              <span className="nx-status-dot" aria-hidden="true" />
              <span>
                匹配 <span className="nx-status-count">{matchedSites}</span> 个站点
              </span>
              <button type="button" onClick={clearSearch}>
                清除筛选
              </button>
            </div>
          </div>
        </section>

        {matches.length > 0 && (
          <div className="nx-mobile-nav" aria-label="分类快捷切换">
            <button
              type="button"
              className="nx-mobile-action"
              aria-label="跳到搜索框"
              onClick={mobileSearchFocus}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
            <div className="nx-pill-wrap" ref={pillWrapRef}>
              <PillNav
                items={pillItems}
                activeHref={effectiveActive ? `#${effectiveActive}` : undefined}
                theme={theme}
                size="md"
                layout="split"
                surface="glass"
                itemStyle="plain"
                hoverEffect="fill"
                indicator="dot"
                barColor="var(--nx-surface)"
                textColor="var(--nx-muted)"
                highlightColor="var(--nx-accent)"
                highlightTextColor={theme === 'dark' ? '#10141c' : '#ffffff'}
                collapse="never"
                ariaLabel="分类快捷切换"
                className="nx-category-pills"
                style={{ '--pn-x': '10px', '--pn-pad': '0px' }}
                onItemClick={(item, _index, event) => {
                  event.preventDefault();
                  const href = item.href;
                  if (href) handleNavSelect(href.slice(1));
                }}
              />
            </div>
            <button
              type="button"
              className="nx-mobile-action"
              aria-label="回到顶部"
              onClick={() => window.scrollTo(0, 0)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 14 6-6 6 6" />
              </svg>
            </button>
          </div>
        )}

        <div className="nx-sections" id="sections">
          {matches.map(({ category, sites }, index) => {
            const domId = sectionId(category.id);
            const displaySites = sortForDisplay(sites);
            return (
              <section
                key={category.id}
                id={domId}
                className="nx-group"
                aria-labelledby={`${domId}-title`}
              >
                <AnimatedContent
                  distance={0}
                  scale={0.99}
                  animateOpacity={false}
                  duration={0.5}
                  threshold={0.08}
                  once
                >
                  <header className="nx-group-head">
                    <span className="nx-group-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 id={`${domId}-title`} className="nx-group-title">
                      {category.title}
                    </h2>
                    <span className="nx-group-count">{sites.length}</span>
                    <span className="nx-group-rule" aria-hidden="true" />
                  </header>
                </AnimatedContent>

                <AnimatedContent
                  className="nx-grid"
                  distance={0}
                  scale={0.985}
                  animateOpacity={false}
                  duration={0.5}
                  stagger={0.03}
                  threshold={0.08}
                  once
                >
                  {displaySites.map((site, siteIndex) => (
                    <SiteCard
                      key={`${category.id}-${site.id}-${siteIndex}`}
                      website={site}
                      theme={theme}
                    />
                  ))}
                </AnimatedContent>
              </section>
            );
          })}

          {searching && matches.length === 0 && (
            <div className="nx-empty">
              <span className="nx-empty-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                  <path d="m8.8 8.8 4.4 4.4M13.2 8.8l-4.4 4.4" />
                </svg>
              </span>
              <h3>没有找到「{query.trim()}」</h3>
              <p>试试更短的关键词，或者直接搜索域名，例如 v2ex.com。</p>
              <button type="button" className="nx-btn-ghost" onClick={clearSearch}>
                清除搜索
              </button>
            </div>
          )}

          {!searching && categories.length === 0 && (
            <div className="nx-empty">
              <h3>还没有站点数据</h3>
              <p>数据文件没有返回分类，请检查 public/data/db.json 或重新加载。</p>
              <button type="button" className="nx-btn-ghost" onClick={() => fetchCategories()}>
                重新加载
              </button>
            </div>
          )}
        </div>

        <div className="nx-sr-only" role="status" aria-live="polite">
          {searching
            ? matchedSites === 0
              ? '没有找到匹配的站点'
              : `找到 ${matchedSites} 个站点`
            : ''}
        </div>

        <footer className="nx-foot">
          <div>
            <span className="nx-foot-brand">共 {totalSites} 个站点</span> · {categories.length} 个分类
          </div>
          <div>图标版权归各站点所有</div>
        </footer>
      </main>
    </div>
  );
}
