import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { useSettings } from "../../../hooks/useSettings";
import { useSettingsStore } from "../../../stores/settingsStore";
import { commands } from "@/bindings";
import type { AccentColor, ThemeMode } from "@/bindings";

const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

const ACCENT_COLORS: {
  id: AccentColor;
  hex: string;
}[] = [
  { id: "system", hex: "" },
  { id: "blue", hex: "#5b9bf5" },
  { id: "green", hex: "#34c759" },
  { id: "red", hex: "#ff3b30" },
  { id: "purple", hex: "#af52de" },
  { id: "orange", hex: "#ff9500" },
  { id: "pink", hex: "#ff2d55" },
  { id: "teal", hex: "#30b0c7" },
  { id: "yellow", hex: "#ffcc00" },
];

export const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [systemAccentColor, setSystemAccentColor] = useState<string | null>(
    null,
  );

  useEffect(() => {
    commands.getSystemAccentColor().then((color) => {
      if (color) {
        setSystemAccentColor(color);
      }
    });
  }, []);

  const currentTheme = settings?.theme_mode ?? "system";
  const currentAccent = settings?.accent_color ?? "system";

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.appearance.title")}>
        <SettingContainer
          title={t("settings.appearance.themeMode.title")}
          description={t("settings.appearance.themeMode.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <div className="flex gap-1 bg-mid-gray/10 rounded-lg p-1">
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => updateSetting("theme_mode", mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentTheme === mode
                    ? "bg-logo-primary text-white"
                    : "hover:bg-mid-gray/20"
                }`}
              >
                {t(`settings.appearance.themeMode.${mode}`)}
              </button>
            ))}
          </div>
        </SettingContainer>

        <SettingContainer
          title={t("settings.appearance.accentColor.title")}
          description={t("settings.appearance.accentColor.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((color) => {
              const displayColor =
                color.id === "system"
                  ? systemAccentColor || "#808080"
                  : color.hex;
              const isActive = currentAccent === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => updateSetting("accent_color", color.id)}
                  className={`relative w-7 h-7 rounded-full transition-all ${
                    isActive
                      ? "ring-2 ring-offset-2 ring-offset-background"
                      : "hover:scale-110"
                  }`}
                  style={{
                    backgroundColor: displayColor,
                    ringColor: displayColor,
                    boxShadow: isActive
                      ? `0 0 0 2px var(--color-background), 0 0 0 4px ${displayColor}`
                      : undefined,
                  }}
                  title={t(`settings.appearance.accentColor.${color.id}`)}
                >
                  {color.id === "system" && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                      A
                    </span>
                  )}
                  {isActive && color.id !== "system" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-3.5 h-3.5 text-white drop-shadow-sm"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
