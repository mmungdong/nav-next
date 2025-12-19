// 图标加载失败的URL缓存集合
const failedIconUrls = new Set<string>();

// 检查图标URL是否已知失败
export function isIconUrlFailed(url: string): boolean {
  return failedIconUrls.has(url);
}

// 标记图标URL为失败
export function markIconUrlAsFailed(url: string): void {
  failedIconUrls.add(url);
}

export default function DefaultIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="defaultIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#defaultIconGradient)" />
      <circle cx="20" cy="18" r="5" fill="white" opacity="0.9" />
      <rect x="12" y="25" width="16" height="3" rx="1.5" fill="white" opacity="0.9" />
    </svg>
  );
}