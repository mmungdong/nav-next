import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // Emit directory indexes so nested static routes survive a hard refresh on
  // plain file servers that do not map /system to system.html.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
