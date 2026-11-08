'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { isIconUrlFailed, markIconUrlAsFailed } from './DefaultIcon';

interface OptimizedImageProps {
  src: string | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 40,
  height = 40,
  className = '',
  fallbackClassName = '',
  priority = false,
  sizes,
  onLoad,
  onError,
}) => {
  // State is keyed by src so switching images resets both flags without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const hasError = failedSrc === src;
  const isLoading = Boolean(src) && loadedSrc !== src;

  if (!src || isIconUrlFailed(src) || hasError) {
    return (
      <div
        className={`rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden ${fallbackClassName}`}
        style={{ width, height, flexShrink: 0 }}
      >
        <span className="text-white text-xs font-bold">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`${className} bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg`}
             style={{ width: `${width}px`, height: `${height}px` }} />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        priority={priority}
        sizes={sizes}
        onError={() => {
          if (src) {
            setFailedSrc(src);
            markIconUrlAsFailed(src);
          }
          onError?.();
        }}
        onLoad={() => {
          setLoadedSrc(src ?? null);
          onLoad?.();
        }}
        unoptimized // 对于外部URL，Next.js优化可能不适用
      />
    </div>
  );
};

export default OptimizedImage;