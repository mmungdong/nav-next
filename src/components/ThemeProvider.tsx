'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';
import { useConfigStore } from '@/stores/configStore';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useConfigStore((s) => s.siteConfig.site.theme);
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
