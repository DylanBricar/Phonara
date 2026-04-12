import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { commands } from "@/bindings";
import type { AccentColor, ThemeMode } from "@/bindings";

const ACCENT_PALETTE: Record<
  Exclude<AccentColor, "system">,
  [string, string, string, string, string]
> = {
  blue: ["#5b9bf5", "#1e3a5f", "#6aa3f7", "#b8d4fc", "#4a7fd4"],
  green: ["#34c759", "#1a5e2a", "#4ade80", "#a7f3d0", "#2d9e4a"],
  red: ["#ff3b30", "#7a1a14", "#f87171", "#fecaca", "#dc2626"],
  purple: ["#af52de", "#4a1d6e", "#c084fc", "#e9d5ff", "#9333ea"],
  orange: ["#ff9500", "#7a4800", "#fb923c", "#fed7aa", "#ea7e00"],
  pink: ["#ff2d55", "#7a1529", "#f472b6", "#fbcfe8", "#e11d48"],
  teal: ["#30b0c7", "#16535e", "#5eead4", "#a7f3d0", "#0d9488"],
  yellow: ["#e6b800", "#6e5800", "#facc15", "#fef08a", "#ca8a04"],
};

function paletteFromHex(hex: string): [string, string, string, string, string] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");

  const lightStroke = `#${toHex(r * 0.4)}${toHex(g * 0.4)}${toHex(b * 0.4)}`;
  const darkPrimary = `#${toHex(r * 1.15)}${toHex(g * 1.15)}${toHex(b * 1.15)}`;
  const darkStroke = `#${toHex(r * 0.7 + 76)}${toHex(g * 0.7 + 76)}${toHex(b * 0.7 + 76)}`;
  const uiColor = `#${toHex(r * 0.85)}${toHex(g * 0.85)}${toHex(b * 0.85)}`;

  return [hex, lightStroke, darkPrimary, darkStroke, uiColor];
}

export function useTheme() {
  const settings = useSettingsStore((s) => s.settings);
  const [systemAccentColor, setSystemAccentColor] = useState<string | null>(
    null,
  );
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    commands.getSystemAccentColor().then((color) => {
      if (color) setSystemAccentColor(color);
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!settings) return;

    const themeMode: ThemeMode = settings.theme_mode ?? "system";
    const accentColor: AccentColor = settings.accent_color ?? "system";

    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (themeMode === "light") {
      root.classList.add("light");
    } else if (themeMode === "dark") {
      root.classList.add("dark");
    }

    let isDark = false;
    if (themeMode === "dark") {
      isDark = true;
    } else if (themeMode === "system") {
      isDark = systemIsDark;
    }

    let palette: [string, string, string, string, string];

    if (accentColor === "system") {
      if (systemAccentColor) {
        palette = paletteFromHex(systemAccentColor);
      } else {
        palette = ACCENT_PALETTE.blue;
      }
    } else {
      palette = ACCENT_PALETTE[accentColor];
    }

    const [lightPrimary, lightStroke, darkPrimary, darkStroke, uiColor] =
      palette;

    if (isDark) {
      root.style.setProperty("--color-logo-primary", darkPrimary);
      root.style.setProperty("--color-logo-stroke", darkStroke);
      root.style.setProperty("--color-text", "#fbfbfb");
      root.style.setProperty("--color-background", "#2c2b29");
    } else {
      root.style.setProperty("--color-logo-primary", lightPrimary);
      root.style.setProperty("--color-logo-stroke", lightStroke);
      root.style.setProperty("--color-text", "#0f0f0f");
      root.style.setProperty("--color-background", "#fbfbfb");
    }
    root.style.setProperty("--color-background-ui", uiColor);
  }, [
    settings?.theme_mode,
    settings?.accent_color,
    systemAccentColor,
    systemIsDark,
  ]);
}
