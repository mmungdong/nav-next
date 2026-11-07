'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { ReactNode, useEffect } from 'react';
import { useConfigStore } from '@/stores/configStore';
import {
  CONFIG_THEME_MARKER_KEY,
  THEME_STORAGE_KEY,
  shouldApplyConfigTheme,
} from '@/lib/theme';

// Applies the admin-configured default theme once config is loaded, without
// overriding a theme the visitor picked explicitly. next-themes' own toggle keeps
// writing "theme", so a user choice wins from then on.
function ConfigThemeSync() {
  const { setTheme } = useTheme();
  const loading = useConfigStore((s) => s.loading);
  const configTheme = useConfigStore((s) => s.siteConfig.site.theme);

  useEffect(() => {
    if (loading) return;
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const appliedDefault = localStorage.getItem(CONFIG_THEME_MARKER_KEY);
      if (!shouldApplyConfigTheme(storedTheme, appliedDefault, configTheme)) return;
      localStorage.setItem(CONFIG_THEME_MARKER_KEY, configTheme);
      setTheme(configTheme);
    } catch {
      // Storage can be unavailable (private mode); keep next-themes' default.
    }
  }, [loading, configTheme, setTheme]);

  return null;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useConfigStore((s) => s.siteConfig.site.theme);
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
      disableTransitionOnChange
    >
      <ConfigThemeSync />
      {children}
    </NextThemesProvider>
  );
}
