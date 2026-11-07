import { ThemeMode } from '@/types';

// next-themes persists an explicit user choice under "theme".
export const THEME_STORAGE_KEY = 'theme';
// Remembers the config value we last applied, so a later admin default change
// can still reach users who never picked a theme themselves.
export const CONFIG_THEME_MARKER_KEY = 'nx-config-theme-applied';

const THEMES: ThemeMode[] = ['light', 'dark', 'system'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

/**
 * `storedTheme` is next-themes' persisted value (or null).
 * `appliedDefault` is the config theme this app applied last time.
 * A config default should apply when the user never chose a theme, or when the
 * stored value is still the default we applied ourselves.
 */
export function shouldApplyConfigTheme(
  storedTheme: string | null,
  appliedDefault: string | null,
  configTheme: string
): boolean {
  if (!isThemeMode(configTheme)) return false;
  if (!storedTheme) return true;
  return appliedDefault !== null && storedTheme === appliedDefault;
}
