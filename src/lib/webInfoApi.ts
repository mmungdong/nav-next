// 获取网站信息的API函数
// 参考原Angular项目的实现

interface WebInfo {
  title?: string;
  description?: string;
  url?: string; // 图标URL
  [key: string]: string | undefined;
}

export interface WebInfoLookup {
  info: WebInfo;
  /** Why the lookup was degraded or failed; null when the service answered. */
  error: string | null;
}

const SERVICE_URL = 'https://api.nav3.cn/api/icon';
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * 获取网站信息（标题、描述、图标等）
 *
 * Resolves with the metadata plus a user-facing reason when the third-party
 * service could not be used. A caller abort rejects instead, so stale requests
 * never produce a result.
 */
export async function getWebInfo(
  url: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<WebInfoLookup> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();

  const degrade = (reason: string): WebInfoLookup => ({
    info: buildFallbackInfo(url),
    error: reason,
  });

  try {
    const response = await fetch(SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return degrade(`识别服务返回 HTTP ${response.status}，已填入域名与图标，可手动修改。`);
    }

    const raw = (await response.json()) as unknown;
    const data =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, string | undefined>)
        : {};
    const info: WebInfo = {
      title: data.title || data.name || '',
      description: data.description || data.desc || '',
      url: data.url || data.icon || '', // 图标URL
      ...data,
    };

    if (!info.title && !info.url) {
      return degrade('识别服务未返回可用信息，已填入域名与图标，可手动修改。');
    }
    return { info, error: null };
  } catch (error) {
    // The caller cancelled (modal closed or a newer request); nothing to report.
    if (options.signal?.aborted) throw error;
    if (timedOut) {
      return degrade(
        `自动识别超时（${timeoutMs / 1000}s），已填入域名与图标，可手动修改。`
      );
    }
    console.warn('获取网站信息失败:', error);
    return degrade('自动识别失败，已填入域名与图标，可手动修改。');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

/** Best-effort metadata derived from the URL when the service is unusable. */
function buildFallbackInfo(url: string): WebInfo {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return {
      title: domain,
      description: `访问 ${domain}`,
      url: getFaviconUrl(url),
    };
  } catch {
    return {};
  }
}

/**
 * 获取favicon图标URL
 * @param url 网站URL
 * @returns favicon URL
 */
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
  } catch {
    return '';
  }
}
