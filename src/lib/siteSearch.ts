import { ICategory, IWebsite } from '@/types';

export interface CategoryMatch {
  category: ICategory;
  sites: IWebsite[];
}

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

// NFKC keeps full-width Latin / digits searchable, collapse whitespace so a
// pasted value with trailing spaces still matches.
export function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidSiteUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return HTTP_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

// Display-friendly hostname; falls back to a protocol-stripped string instead of
// throwing so one malformed record cannot break the card grid.
export function siteDomain(url: string | undefined): string {
  if (!url) return '';
  try {
    const host = new URL(url).hostname;
    return host ? host.replace(/^www\./, '') : '';
  } catch {
    return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/[/?#].*$/, '').trim();
  }
}

const searchableText = (site: IWebsite): string =>
  normalizeSearch(
    [site.name, site.desc, site.url, siteDomain(site.url)].filter(Boolean).join(' ')
  );

const siteMatches = (site: IWebsite, query: string): boolean =>
  searchableText(site).includes(query);

export function filterCategories(
  categories: ICategory[],
  rawQuery: string
): CategoryMatch[] {
  const query = normalizeSearch(rawQuery);

  return categories.reduce<CategoryMatch[]>((acc, category) => {
    const sites = category.nav ?? [];
    if (!query) {
      acc.push({ category, sites });
      return acc;
    }

    // A category-name hit exposes every site in that category; otherwise only
    // the sites whose own fields match. Same rule for the page and the modal.
    if (normalizeSearch(category.title).includes(query)) {
      acc.push({ category, sites });
      return acc;
    }

    const matched = sites.filter((site) => siteMatches(site, query));
    if (matched.length > 0) acc.push({ category, sites: matched });
    return acc;
  }, []);
}

export function countMatchedSites(matches: CategoryMatch[]): number {
  return matches.reduce((sum, match) => sum + match.sites.length, 0);
}

export function countAllSites(categories: ICategory[]): number {
  return categories.reduce((sum, category) => sum + (category.nav?.length ?? 0), 0);
}
