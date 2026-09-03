import { commands, type ThemeMode } from "@/bindings";

/** Theme bridge shared by the settings and overlay webviews. */
export const THEME_STORAGE_KEY = "phonara.theme";
export const THEME_OPTIONS: ThemeMode[] = ["system", "light", "dark"];

const isTheme = (value: unknown): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

export const applyTheme = (theme: ThemeMode): void => {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // AppSettings remains the source of truth when storage is unavailable.
  }
};

export const getStoredTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Follow the system theme if storage is unavailable.
  }
  return "system";
};

export const syncThemeFromSettings = async (): Promise<void> => {
  try {
    const result = await commands.getAppSettings();
    if (result.status === "ok") applyTheme(result.data.theme_mode ?? "system");
  } catch (error) {
    console.warn("Failed to sync theme from settings:", error);
  }
};
