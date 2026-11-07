'use client';

import SpotlightCard from '@/components/react-bits/SpotlightCard';
import OptimizedImage from '@/components/OptimizedImage';
import { isValidSiteUrl, siteDomain } from '@/lib/siteSearch';
import { IWebsite } from '@/types';

interface SiteCardProps {
  website: IWebsite;
  theme: 'dark' | 'light';
}

export default function SiteCard({ website, theme }: SiteCardProps) {
  const hasLink = isValidSiteUrl(website.url);
  const domain = siteDomain(website.url);

  const card = (
    <SpotlightCard
      className="nx-site-card"
      theme={theme}
      spotlightColor={theme === 'dark' ? '#6ba8ff' : '#255fd8'}
      intensity={theme === 'dark' ? 0.16 : 0.1}
      spotlightSize={260}
      softness={0.68}
      shape="circle"
      borderGlow={theme === 'dark' ? 0.55 : 0.35}
      // A page with 147 cards cannot afford the upstream 24px proximity, which
      // wakes every card's rAF loop on each pointer move.
      proximity={0}
      smoothing={0.32}
      style={{
        '--spotlight-card-surface': 'var(--nx-surface)',
        '--spotlight-card-border': 'var(--nx-border)',
        '--spotlight-card-shadow': 'none',
      }}
    >
      <span className="nx-card-top">
        <span className="nx-site-icon" aria-hidden="true">
          <OptimizedImage
            src={website.icon}
            alt={website.name}
            width={23}
            height={23}
            className="nx-site-img"
            fallbackClassName="nx-site-fallback"
          />
        </span>
        <span className="nx-card-ext" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 16 16 8" />
            <path d="M9.5 8H16v6.5" />
          </svg>
        </span>
      </span>
      <h3 className="nx-card-title">{website.name || '未命名站点'}</h3>
      <p className="nx-card-desc">{website.desc}</p>
      <span className="nx-domain">{domain}</span>
    </SpotlightCard>
  );

  if (!hasLink) {
    return (
      <div className="nx-site-link" aria-disabled="true" title={website.url || undefined}>
        {card}
      </div>
    );
  }

  return (
    <a
      className="nx-site-link"
      href={website.url}
      target="_blank"
      rel="noopener noreferrer"
      title={website.url}
    >
      {card}
      <span className="nx-sr-only">（在新标签页打开）</span>
    </a>
  );
}
