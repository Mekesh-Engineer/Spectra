export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "spectra-theme-mode";

function normalizeTheme(value: string | null): ThemeMode | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const stored = normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  if (stored) return stored;

  const root = document.documentElement;
  const attrTheme = normalizeTheme(root.getAttribute("data-theme"));
  if (attrTheme) return attrTheme;

  const attrMode = normalizeTheme(root.getAttribute("data-mode"));
  if (attrMode) return attrMode;

  return "light";
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.setAttribute("data-mode", mode);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}
