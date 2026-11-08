'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SiteSearchResults from './SiteSearchResults';
import OptimizedImage from '@/components/OptimizedImage';
import { useConfigStore } from '@/stores/configStore';
import { safeHostname } from '@/lib/utils';
import { isValidSiteUrl } from '@/lib/siteSearch';
import { nextSelection, previousSelection } from '@/lib/searchNavigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Engine {
  id: string;
  name: string;
  url: string;
  internal: boolean;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [engineId, setEngineId] = useState('internal');
  const [activeIndex, setActiveIndex] = useState(-1);
  const composingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { siteConfig } = useConfigStore();
  const engines = useMemo<Engine[]>(
    () => [
      { id: 'internal', name: '站内', url: '', internal: true },
      ...siteConfig.search.engines.map((engine) => ({
        id: engine.id,
        name: engine.name,
        url: engine.url,
        internal: false,
      })),
    ],
    [siteConfig.search.engines]
  );
  const activeEngine = engines.find((engine) => engine.id === engineId) ?? engines[0];
  const engineUrlValid = activeEngine.internal || isValidSiteUrl(activeEngine.url);

  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
      const previous = previousActiveRef.current;
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getResultLinks = (): HTMLElement[] =>
    Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('[data-search-result]') ?? []);

  const runExternalSearch = () => {
    const keyword = searchQuery.trim();
    if (!keyword || activeEngine.internal) return;
    if (!isValidSiteUrl(activeEngine.url)) return;
    const target = `${activeEngine.url}${encodeURIComponent(keyword)}`;
    if (!isValidSiteUrl(target)) return;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter during IME composition confirms the candidate, never the search.
    if (event.nativeEvent.isComposing || composingRef.current) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!activeEngine.internal) return;
      const links = getResultLinks();
      if (links.length === 0) return;
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? nextSelection(activeIndex, links.length)
          : previousSelection(activeIndex, links.length);
      setActiveIndex(next);
      links[next]?.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (activeEngine.internal) {
      // No relative-URL navigation: with no selection the results stay put.
      const links = getResultLinks();
      if (activeIndex >= 0 && links[activeIndex]) links[activeIndex].click();
      return;
    }
    runExternalSearch();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="nx-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="nx-modal"
        role="dialog"
        aria-modal="true"
        aria-label="搜索"
      >
        <div className="nx-modal-head">
          <span className="nx-modal-search-icon" aria-hidden="true">
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
          <label className="nx-sr-only" htmlFor="global-search-input">
            搜索关键词
          </label>
          <input
            ref={searchInputRef}
            id="global-search-input"
            className="nx-modal-input"
            type="text"
            value={searchQuery}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              activeEngine.internal
                ? '输入关键词筛选站内站点…'
                : `用 ${activeEngine.name} 搜索…`
            }
            onChange={(event) => {
              if (!composingRef.current) {
                setSearchQuery(event.target.value);
                setActiveIndex(-1);
              }
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              setSearchQuery(event.currentTarget.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <button
            type="button"
            className="nx-modal-close"
            aria-label="关闭搜索"
            onClick={onClose}
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
        </div>

        <div className="nx-modal-body">
          {activeEngine.internal ? (
            <SiteSearchResults query={searchQuery} onClose={onClose} activeIndex={activeIndex} />
          ) : (
            <div className="nx-modal-external">
              <p>
                使用 <strong>{activeEngine.name}</strong> 搜索
                {searchQuery.trim() ? `「${searchQuery.trim()}」` : '关键词'}
              </p>
              {engineUrlValid ? (
                <button
                  type="button"
                  className="nx-btn-ghost"
                  onClick={runExternalSearch}
                  disabled={!searchQuery.trim()}
                >
                  打开 {activeEngine.name}
                </button>
              ) : (
                <p className="nx-modal-engine-error" role="alert">
                  该搜索引擎的 URL 无效，请在后台“搜索管理”中修复；其他引擎仍可使用。
                </p>
              )}
            </div>
          )}
        </div>

        <div className="nx-modal-engines">
          {engines.map((engine) => {
            const host =
              engine.internal || !isValidSiteUrl(engine.url) ? '' : safeHostname(engine.url);
            return (
              <button
                key={engine.id}
                type="button"
                className={`nx-engine-chip${engine.internal ? '' : engine.url && !isValidSiteUrl(engine.url) ? ' is-invalid' : ''}`}
                aria-pressed={activeEngine.id === engine.id}
                onClick={() => {
                  setEngineId(engine.id);
                  setActiveIndex(-1);
                }}
              >
                {engine.internal ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                ) : host ? (
                  <OptimizedImage
                    src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                    alt={engine.name}
                    width={14}
                    height={14}
                    fallbackClassName="nx-engine-fallback"
                  />
                ) : null}
                <span>{engine.name}</span>
              </button>
            );
          })}
          <span className="nx-modal-hint">
            {activeEngine.internal ? '↑↓ 选择 · Enter 打开 · Esc 关闭' : 'Enter 搜索 · Esc 关闭'}
          </span>
        </div>
      </div>
    </>
  );
};

export default SearchModal;
