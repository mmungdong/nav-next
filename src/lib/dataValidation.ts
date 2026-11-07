import { ICategory, ISearchEngine, ISiteConfig, IWebsite, ThemeMode } from '@/types';
import { ValidationIssue, ValidationResult } from '@/lib/syncTypes';

const THEMES: ThemeMode[] = ['light', 'dark', 'system'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Icons in the existing data are https URLs, inline image data URLs, or site-relative
// paths. All three are accepted so validation never empties a working icon field.
export const isAcceptedIcon = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (value.startsWith('data:image/')) return true;
  if (value.startsWith('/')) return true;
  return isHttpUrl(value);
};

/** Drops the retired private flag and keeps every other field, including unknown ones. */
export function normalizeWebsite(raw: unknown): IWebsite {
  const record = isRecord(raw) ? raw : {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'ownVisible') continue;
    rest[key] = value;
  }
  return rest as unknown as IWebsite;
}

export function normalizeCategory(raw: unknown): ICategory {
  const record = isRecord(raw) ? raw : {};
  const nav = Array.isArray(record.nav) ? record.nav.map(normalizeWebsite) : [];
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'nav') continue;
    rest[key] = value;
  }
  return { ...rest, nav } as unknown as ICategory;
}

export function normalizeCategories(raw: unknown): ICategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCategory);
}

export function normalizeSiteConfig(raw: unknown): ISiteConfig {
  const record = isRecord(raw) ? raw : {};
  const site = isRecord(record.site) ? record.site : {};
  const search = isRecord(record.search) ? record.search : {};
  const engines = Array.isArray(search.engines) ? search.engines : [];
  return {
    site: {
      name: typeof site.name === 'string' ? site.name : '',
      description: typeof site.description === 'string' ? site.description : '',
      theme: THEMES.includes(site.theme as ThemeMode) ? (site.theme as ThemeMode) : 'system',
    },
    search: {
      engines: engines
        .filter(isRecord)
        .map((engine) => ({
          id: String(engine.id ?? ''),
          name: String(engine.name ?? ''),
          url: String(engine.url ?? ''),
          icon: typeof engine.icon === 'string' ? engine.icon : '',
        })),
    },
  };
}

export function validateCategories(raw: unknown): ValidationResult<ICategory[]> {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: 'categories', message: '顶层必须是分类数组' }],
    };
  }

  const categoryIds = new Set<number>();
  const websiteIds = new Map<number, string>();

  raw.forEach((categoryValue, categoryIndex) => {
    const path = `categories[${categoryIndex}]`;
    if (!isRecord(categoryValue)) {
      issues.push({ path, message: '分类必须是对象' });
      return;
    }
    if (!isFiniteNumber(categoryValue.id) || !Number.isInteger(categoryValue.id)) {
      issues.push({ path: `${path}.id`, message: '分类 id 必须是有限整数' });
    } else if (categoryIds.has(categoryValue.id)) {
      issues.push({ path: `${path}.id`, message: `分类 id ${categoryValue.id} 重复` });
    } else {
      categoryIds.add(categoryValue.id);
    }
    if (typeof categoryValue.title !== 'string' || !categoryValue.title.trim()) {
      issues.push({ path: `${path}.title`, message: '分类标题必须是非空字符串' });
    }
    if (categoryValue.icon !== undefined && typeof categoryValue.icon !== 'string') {
      issues.push({ path: `${path}.icon`, message: '分类图标必须是字符串' });
    }
    if (!Array.isArray(categoryValue.nav)) {
      issues.push({ path: `${path}.nav`, message: 'nav 必须是网站数组' });
      return;
    }

    categoryValue.nav.forEach((websiteValue, websiteIndex) => {
      const websitePath = `${path}.nav[${websiteIndex}]`;
      if (!isRecord(websiteValue)) {
        issues.push({ path: websitePath, message: '网站必须是对象' });
        return;
      }
      if (!isFiniteNumber(websiteValue.id) || !Number.isInteger(websiteValue.id)) {
        issues.push({ path: `${websitePath}.id`, message: '网站 id 必须是有限整数' });
      } else {
        const previous = websiteIds.get(websiteValue.id);
        if (previous) {
          issues.push({
            path: `${websitePath}.id`,
            message: `网站 id ${websiteValue.id} 与 ${previous} 重复`,
          });
        } else {
          websiteIds.set(websiteValue.id, websitePath);
        }
      }
      if (typeof websiteValue.name !== 'string' || !websiteValue.name.trim()) {
        issues.push({ path: `${websitePath}.name`, message: '网站名称必须是非空字符串' });
      }
      if (typeof websiteValue.desc !== 'string') {
        issues.push({ path: `${websitePath}.desc`, message: '网站描述必须是字符串' });
      }
      if (!isHttpUrl(websiteValue.url)) {
        issues.push({
          path: `${websitePath}.url`,
          message: '网站 URL 必须是合法的 http/https 地址',
        });
      }
      if (!isAcceptedIcon(websiteValue.icon)) {
        issues.push({
          path: `${websitePath}.icon`,
          message: '图标必须是空值、http(s) URL、data:image 或站内相对路径',
        });
      }
      if (
        websiteValue.tags !== undefined &&
        (!Array.isArray(websiteValue.tags) ||
          websiteValue.tags.some(
            (tag) =>
              typeof tag !== 'string' &&
              (!isRecord(tag) ||
                (tag.id !== undefined && typeof tag.id !== 'string') ||
                (tag.url !== undefined && typeof tag.url !== 'string'))
          ))
      ) {
        issues.push({
          path: `${websitePath}.tags`,
          message: 'tags 必须是字符串或包含 id/url 的标签对象数组',
        });
      }
      if (websiteValue.rate !== undefined && !isFiniteNumber(websiteValue.rate)) {
        issues.push({ path: `${websitePath}.rate`, message: 'rate 必须是有限数字' });
      }
      if (websiteValue.top !== undefined && typeof websiteValue.top !== 'boolean') {
        issues.push({ path: `${websitePath}.top`, message: 'top 必须是布尔值' });
      }
      if (
        websiteValue.topTypes !== undefined &&
        (!Array.isArray(websiteValue.topTypes) ||
          websiteValue.topTypes.some((item) => !isFiniteNumber(item)))
      ) {
        issues.push({
          path: `${websitePath}.topTypes`,
          message: 'topTypes 必须是数字数组',
        });
      }
      // Legacy data stores `index: null` for unranked sites; treat both null and
      // undefined as "no index" so migration never rejects real bookmarks.
      if (
        websiteValue.index !== undefined &&
        websiteValue.index !== null &&
        !isFiniteNumber(websiteValue.index)
      ) {
        issues.push({ path: `${websitePath}.index`, message: 'index 必须是有限数字' });
      }
    });
  });

  return {
    ok: issues.length === 0,
    issues,
    value: issues.length === 0 ? normalizeCategories(raw) : undefined,
  };
}

export function validateSiteConfig(raw: unknown): ValidationResult<ISiteConfig> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(raw)) {
    return { ok: false, issues: [{ path: 'siteConfig', message: '配置必须是对象' }] };
  }
  if (!isRecord(raw.site)) {
    issues.push({ path: 'site', message: '缺少 site 配置' });
  } else {
    if (typeof raw.site.name !== 'string' || !raw.site.name.trim()) {
      issues.push({ path: 'site.name', message: '网站名称必须是非空字符串' });
    }
    if (typeof raw.site.description !== 'string') {
      issues.push({ path: 'site.description', message: '网站描述必须是字符串' });
    }
    if (!THEMES.includes(raw.site.theme as ThemeMode)) {
      issues.push({
        path: 'site.theme',
        message: `主题必须是 ${THEMES.join(' / ')} 之一`,
      });
    }
  }

  if (!isRecord(raw.search) || !Array.isArray(raw.search.engines)) {
    issues.push({ path: 'search.engines', message: '引擎必须是数组' });
  } else {
    const engineIds = new Set<string>();
    raw.search.engines.forEach((engine, index) => {
      const path = `search.engines[${index}]`;
      if (!isRecord(engine)) {
        issues.push({ path, message: '引擎必须是对象' });
        return;
      }
      if (typeof engine.id !== 'string' || !engine.id.trim()) {
        issues.push({ path: `${path}.id`, message: '引擎 id 必须是非空字符串' });
      } else if (engineIds.has(engine.id)) {
        issues.push({ path: `${path}.id`, message: `引擎 id ${engine.id} 重复` });
      } else {
        engineIds.add(engine.id);
      }
      if (typeof engine.name !== 'string' || !engine.name.trim()) {
        issues.push({ path: `${path}.name`, message: '引擎名称必须是非空字符串' });
      }
      if (!isHttpUrl(engine.url)) {
        issues.push({
          path: `${path}.url`,
          message: '搜索 URL 必须是合法的 http/https 地址',
        });
      }
      if (engine.icon !== undefined && typeof engine.icon !== 'string') {
        issues.push({ path: `${path}.icon`, message: '引擎图标必须是字符串' });
      }
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    value: issues.length === 0 ? normalizeSiteConfig(raw) : undefined,
  };
}

export const formatIssues = (issues: ValidationIssue[], limit = 8): string =>
  issues
    .slice(0, limit)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join('；') + (issues.length > limit ? `；其余 ${issues.length - limit} 条略` : '');

export function isSearchEngine(value: unknown): value is ISearchEngine {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  );
}
