// 获取网站信息的API函数
// 参考原Angular项目的实现

interface WebInfo {
  title?: string;
  description?: string;
  url?: string; // 图标URL
  [key: string]: string | undefined;
}

/**
 * 获取网站信息（标题、描述、图标等）
 * @param url 网站URL
 * @returns 网站信息对象
 */
export async function getWebInfo(url: string): Promise<WebInfo> {
  try {
    // 使用第三方服务获取网站信息
    // 这里使用一个简单的方案，实际项目中可能需要更复杂的实现

    // 首先尝试使用nav3.cn的服务（与原项目保持一致）
    const response = await fetch('https://api.nav3.cn/api/icon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || data.name || '',
        description: data.description || data.desc || '',
        url: data.url || data.icon || '', // 图标URL
        ...data,
      };
    }

    // 如果主要服务不可用，尝试备选方案
    return await getWebInfoFallback(url);
  } catch (error) {
    console.warn('获取网站信息失败:', error);
    // 返回空对象而不是抛出错误
    return {};
  }
}

/**
 * 备选方案获取网站信息
 * @param url 网站URL
 * @returns 网站信息对象
 */
async function getWebInfoFallback(url: string): Promise<WebInfo> {
  try {
    // 创建一个隐藏的iframe来获取网站信息
    // 注意：由于CORS限制，这种方法在实际应用中可能不工作
    // 这里仅作为示例

    // 简单的备选方案：从URL中提取域名作为标题
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    return {
      title: domain,
      description: `访问 ${domain}`,
      url: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`,
    };
  } catch (error) {
    console.warn('备选方案获取网站信息失败:', error);
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
