'use client';

import { useMemo } from 'react';
import { useNavStore } from '@/stores/navStore';
import OptimizedImage from '@/components/OptimizedImage';
import {
  countMatchedSites,
  filterCategories,
  isValidSiteUrl,
  normalizeSearch,
  siteDomain,
} from '@/lib/siteSearch';

interface SiteSearchResultsProps {
  query: string;
  onClose: () => void;
}

// Same matching rules as the home page: category hits expose every site,
// otherwise only the matching sites are listed.
const SiteSearchResults: React.FC<SiteSearchResultsProps> = ({ query, onClose }) => {
  const { categories } = useNavStore();
  const term = normalizeSearch(query);
  const matches = useMemo(() => filterCategories(categories, query), [categories, query]);
  const total = useMemo(() => countMatchedSites(matches), [matches]);

  if (!term) {
    return (
      <div className="nx-modal-empty">
        输入站点名、描述、URL 或分类名开始筛选；按 Esc 关闭。
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

  return (
    <div>
      <div className="nx-results-head">
        <span>站内结果</span>
        <span>
          {matches.length} 个分类 · {total} 个站点
        </span>
      </div>
      {matches.map(({ category, sites }) => (
        <div key={category.id} className="nx-results-group">
          <div className="nx-results-category">
            {category.title} · {sites.length}
          </div>
          <ul className="nx-results-list">
            {sites.map((site, index) => {
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

              return (
                <li key={`${category.id}-${site.id}-${index}`}>
                  {isValidSiteUrl(site.url) ? (
                    <a
                      className="nx-result-link"
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
        </div>
      ))}
    </div>
  );
};

export default SiteSearchResults;
