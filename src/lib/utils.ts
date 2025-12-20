// 从仓库URL中提取所有者信息
export function getOwnerFromRepoUrl(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
    if (pathParts.length >= 2) {
      return pathParts[0];
    }
    return '';
  } catch (error) {
    console.error('解析仓库URL失败:', error);
    return '';
  }
}
