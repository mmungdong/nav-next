'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavStore } from '@/stores/navStore';
import OptimizedImage from '@/components/OptimizedImage';
import {
  countMatchedSites,
  filterCategories,
  isValidSiteUrl,
  normalizeSearch,
  siteDomain,
  sortForDisplay,
} from '@/lib/siteSearch';

interface SiteSearchResultsProps {
  query: string;
  onClose: () => void;
  activeIndex?: number;
}

const PREVIEW_COUNT = 5;

// Same matching rules as the home page: a category hit exposes every site,
// otherwise only the matching sites are listed.
const SiteSearchResults: React.FC<SiteSearchResultsProps> = ({
  query,
  onClose,
  activeIndex = -1,
}) => {
  const { categories } = useNavStore();
  const term = normalizeSearch(query);
  const matches = useMemo(() => filterCategories(categories, query), [categories, query]);
  const total = useMemo(() => countMatchedSites(matches), [matches]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [term]);

  const toggleCategory = (categoryId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  if (!term) {
    return (
      <div className="nx-modal-empty">
        输入站点名、描述、URL 或分类名开始筛选；↑↓ 选择，Enter 打开，Esc 关闭。
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="nx-modal-empty">
        <p>
          没有找到「<strong>{query.trim()}</strong>」
        </p>
        <p>试试更短的关键词，或者直接搜索域名。</p>
      </div>
    );
  }

  // Link indices must match the DOM order used by the modal's keyboard handler;
  // only usable URLs become navigable links.
  let linkIndex = 0;

  return (
    <div>
      <div className="nx-results-head">
        <span>站内结果</span>
        <span>
          {matches.length} 个分类 · {total} 个站点
        </span>
      </div>
      {matches.map(({ category, sites: matchedSites }) => {
        const sites = sortForDisplay(matchedSites);
        const isExpanded = expanded.has(category.id);
        const isTruncated = !isExpanded && sites.length > PREVIEW_COUNT;
        const visibleSites = isTruncated ? sites.slice(0, PREVIEW_COUNT) : sites;
        const hiddenCount = sites.length - visibleSites.length;
        const hasMoreButton = isTruncated || sites.length > PREVIEW_COUNT;

        // Assign keyboard indices up front so the more/less button follows the
        // links in ArrowDown order instead of being skipped.
        const siteIndices = visibleSites.map((site) =>
          isValidSiteUrl(site.url) ? linkIndex++ : -1
        );
        const moreIndex = hasMoreButton ? linkIndex++ : -1;

        return (
          <div key={category.id} className="nx-results-group">
            <div className="nx-results-category">
              {category.title} · {sites.length}
            </div>
            <ul className="nx-results-list">
              {visibleSites.map((site, index) => {
                const content = (
                  <>
                    <span className="nx-result-icon" aria-hidden="true">
                      <OptimizedImage
                        src={site.icon}
                        alt={site.name}
                        width={18}
                        height={18}
                        className="nx-result-img"
                        fallbackClassName="nx-result-fallback"
                      />
                    </span>
                    <span className="nx-result-body">
                      <span className="nx-result-name">{site.name || '未命名站点'}</span>
                      <span className="nx-result-desc">{site.desc}</span>
                    </span>
                    <span className="nx-result-domain">{siteDomain(site.url)}</span>
                  </>
                );

                const indexForKeyboard = siteIndices[index];

                return (
                  <li key={`${category.id}-${site.id}-${index}`}>
                    {indexForKeyboard >= 0 ? (
                      <a
                        data-search-result=""
                        className={`nx-result-link${activeIndex === indexForKeyboard ? ' is-active' : ''}`}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={site.url}
                        onClick={onClose}
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="nx-result-link" aria-disabled="true">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {isTruncated && (
              <button
                type="button"
                data-search-result=""
                className={`nx-results-more${activeIndex === moreIndex ? ' is-active' : ''}`}
                onClick={() => toggleCategory(category.id)}
              >
                显示剩余 {hiddenCount} 条
              </button>
            )}
            {!isTruncated && sites.length > PREVIEW_COUNT && (
              <button
                type="button"
                data-search-result=""
                className={`nx-results-more${activeIndex === moreIndex ? ' is-active' : ''}`}
                onClick={() => toggleCategory(category.id)}
              >
                收起
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SiteSearchResults;
