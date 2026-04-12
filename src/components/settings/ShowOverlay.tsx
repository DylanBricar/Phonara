import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "@/bindings";
import type { OverlayPosition } from "@/bindings";

interface ShowOverlayProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ShowOverlay: React.FC<ShowOverlayProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const overlayOptions = [
      { value: "none", label: t("settings.advanced.overlay.options.none") },
      { value: "bottom", label: t("settings.advanced.overlay.options.bottom") },
      { value: "top", label: t("settings.advanced.overlay.options.top") },
    ];

    const selectedPosition = (getSetting("overlay_position") ||
      "bottom") as OverlayPosition;

    const borderColor = (getSetting("overlay_border_color") as string) || "";
    const backgroundColor =
      (getSetting("overlay_background_color") as string) || "";
    const borderWidth = (getSetting("overlay_border_width") as number) || 1;
    const customWidth = (getSetting("overlay_custom_width") as number) || 200;
    const customHeight = (getSetting("overlay_custom_height") as number) || 40;

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.overlay.title")}
          description={t("settings.advanced.overlay.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <Dropdown
            options={overlayOptions}
            selectedValue={selectedPosition}
            onSelect={(value) =>
              updateSetting("overlay_position", value as OverlayPosition)
            }
            disabled={isUpdating("overlay_position")}
          />
        </SettingContainer>
        {selectedPosition !== "none" && (
          <>
            <SettingContainer
              title={t("settings.advanced.overlay.borderColor.label")}
              description={t(
                "settings.advanced.overlay.borderColor.description",
              )}
              descriptionMode={descriptionMode}
              grouped={grouped}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor || "#ffffff"}
                  onChange={(e) =>
                    updateSetting("overlay_border_color", e.target.value)
                  }
                  className="w-8 h-8 rounded cursor-pointer border border-mid-gray/40"
                />
                {borderColor && (
                  <button
                    onClick={() => updateSetting("overlay_border_color", null)}
                    className="text-xs text-mid-gray hover:text-text"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>
            </SettingContainer>
            <SettingContainer
              title={t("settings.advanced.overlay.backgroundColor.label")}
              description={t(
                "settings.advanced.overlay.backgroundColor.description",
              )}
              descriptionMode={descriptionMode}
              grouped={grouped}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor || "#1a1a1a"}
                  onChange={(e) =>
                    updateSetting("overlay_background_color", e.target.value)
                  }
                  className="w-8 h-8 rounded cursor-pointer border border-mid-gray/40"
                />
                {backgroundColor && (
                  <button
                    onClick={() =>
                      updateSetting("overlay_background_color", null)
                    }
                    className="text-xs text-mid-gray hover:text-text"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>
            </SettingContainer>
            <SettingContainer
              title={t("settings.advanced.overlay.borderWidth.label")}
              description={t(
                "settings.advanced.overlay.borderWidth.description",
              )}
              descriptionMode={descriptionMode}
              grouped={grouped}
              layout="horizontal"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-grow">
                  <div className="flex items-center space-x-1 h-6">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={borderWidth}
                      onChange={(e) =>
                        updateSetting(
                          "overlay_border_width",
                          Math.round(parseFloat(e.target.value)),
                        )
                      }
                      className="flex-grow h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-logo-primary"
                      style={{
                        background: `linear-gradient(to right, var(--color-background-ui) ${
                          (borderWidth / 5) * 100
                        }%, rgba(128, 128, 128, 0.2) ${
                          (borderWidth / 5) * 100
                        }%)`,
                      }}
                    />
                    {/* eslint-disable i18next/no-literal-string */}
                    <span className="text-sm font-medium text-text/90 min-w-10 text-end">
                      {borderWidth}px
                    </span>
                    {/* eslint-enable i18next/no-literal-string */}
                  </div>
                </div>
                {borderWidth !== 1 && (
                  <button
                    onClick={() => updateSetting("overlay_border_width", 1)}
                    className="text-xs text-mid-gray hover:text-text"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>
            </SettingContainer>
            <SettingContainer
              title={t("settings.advanced.overlay.width.label")}
              description={t("settings.advanced.overlay.width.description")}
              descriptionMode={descriptionMode}
              grouped={grouped}
              layout="horizontal"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-grow">
                  <div className="flex items-center space-x-1 h-6">
                    <input
                      type="range"
                      min={120}
                      max={400}
                      step={10}
                      value={customWidth}
                      onChange={(e) =>
                        updateSetting(
                          "overlay_custom_width",
                          Math.round(parseFloat(e.target.value)),
                        )
                      }
                      className="flex-grow h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-logo-primary"
                      style={{
                        background: `linear-gradient(to right, var(--color-background-ui) ${
                          ((customWidth - 120) / (400 - 120)) * 100
                        }%, rgba(128, 128, 128, 0.2) ${
                          ((customWidth - 120) / (400 - 120)) * 100
                        }%)`,
                      }}
                    />
                    {/* eslint-disable i18next/no-literal-string */}
                    <span className="text-sm font-medium text-text/90 min-w-10 text-end">
                      {customWidth}px
                    </span>
                    {/* eslint-enable i18next/no-literal-string */}
                  </div>
                </div>
                {customWidth !== 200 && (
                  <button
                    onClick={() => updateSetting("overlay_custom_width", 200)}
                    className="text-xs text-mid-gray hover:text-text"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>
            </SettingContainer>
            <SettingContainer
              title={t("settings.advanced.overlay.height.label")}
              description={t("settings.advanced.overlay.height.description")}
              descriptionMode={descriptionMode}
              grouped={grouped}
              layout="horizontal"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-grow">
                  <div className="flex items-center space-x-1 h-6">
                    <input
                      type="range"
                      min={30}
                      max={60}
                      step={2}
                      value={customHeight}
                      onChange={(e) =>
                        updateSetting(
                          "overlay_custom_height",
                          Math.round(parseFloat(e.target.value)),
                        )
                      }
                      className="flex-grow h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-logo-primary"
                      style={{
                        background: `linear-gradient(to right, var(--color-background-ui) ${
                          ((customHeight - 30) / (60 - 30)) * 100
                        }%, rgba(128, 128, 128, 0.2) ${
                          ((customHeight - 30) / (60 - 30)) * 100
                        }%)`,
                      }}
                    />
                    {/* eslint-disable i18next/no-literal-string */}
                    <span className="text-sm font-medium text-text/90 min-w-10 text-end">
                      {customHeight}px
                    </span>
                    {/* eslint-enable i18next/no-literal-string */}
                  </div>
                </div>
                {customHeight !== 40 && (
                  <button
                    onClick={() => updateSetting("overlay_custom_height", 40)}
                    className="text-xs text-mid-gray hover:text-text"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>
            </SettingContainer>
            <SettingContainer
              title={t("settings.advanced.overlay.preview.label")}
              description={t("settings.advanced.overlay.preview.description")}
              descriptionMode={descriptionMode}
              grouped={grouped}
            >
              <button
                onClick={() => commands.previewOverlaySettings()}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-logo-primary/80 hover:bg-logo-primary text-white transition-colors"
              >
                {t("settings.advanced.overlay.preview.button")}
              </button>
            </SettingContainer>
          </>
        )}
      </>
    );
  },
);
