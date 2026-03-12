'use client';

import { useEffect, useCallback } from 'react';

interface UsePreloadOptions {
  enabled?: boolean;
  maxConcurrent?: number;
}

/**
 * 预加载网站图标
 * 在页面加载完成后后台预加载常见的网站 favicon，提升用户体验
 */
export const usePreloadImages = (
  iconUrls: (string | undefined)[],
  options: UsePreloadOptions = {}
) => {
  const { enabled = true, maxConcurrent = 5 } = options;

  const preload = useCallback(async () => {
    if (!enabled || iconUrls.length === 0) return;

    // 过滤有效的 URL
    const validUrls = iconUrls.filter(
      (url): url is string => typeof url === 'string' && url.length > 0
    );

    if (validUrls.length === 0) return;

    // 分批预加载，避免同时发起过多请求
    const batches: string[][] = [];
    for (let i = 0; i < validUrls.length; i += maxConcurrent) {
      batches.push(validUrls.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map((url) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          });
        })
      );
    }
  }, [enabled, iconUrls, maxConcurrent]);

  useEffect(() => {
    // 延迟预加载，确保页面先渲染完成
    const timer = setTimeout(() => {
      preload();
    }, 1000);

    return () => clearTimeout(timer);
  }, [preload]);
};

/**
 * 预加载关键资源
 */
export const usePreloadResources = () => {
  useEffect(() => {
    // 预连接到常用 CDN
    const preconnects = [
      'https://www.google.com',
      'https://github.com',
      'https://api.github.com',
    ];

    preconnects.forEach((url) => {
      // 检查是否已存在 preconnect 链接，避免重复
      const existing = document.querySelector(`link[rel="preconnect"][href="${url}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      document.head.appendChild(link);
    });

    return () => {
      // 清理
      preconnects.forEach((url) => {
        const links = document.querySelectorAll(`link[rel="preconnect"][href="${url}"]`);
        links.forEach((link) => link.remove());
      });
    };
  }, []);
};