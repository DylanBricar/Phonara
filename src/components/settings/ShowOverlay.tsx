import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "@/bindings";
import type { OverlayPosition, OverlayStyle } from "@/bindings";
import { OVERLAY_LIMITS } from "@/overlay/presentation";

interface ShowOverlayProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ShowOverlay: React.FC<ShowOverlayProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const styleOptions = [
      {
        value: "none",
        label: t("settings.advanced.overlay.style.options.none"),
      },
      {
        value: "minimal",
        label: t("settings.advanced.overlay.style.options.minimal"),
      },
      {
        value: "live",
        label: t("settings.advanced.overlay.style.options.live"),
      },
    ];

    const positionOptions = [
      {
        value: "bottom",
        label: t("settings.advanced.overlay.position.options.bottom"),
      },
      {
        value: "top",
        label: t("settings.advanced.overlay.position.options.top"),
      },
    ];

    const selectedStyle = (getSetting("overlay_style") ||
      "live") as OverlayStyle;
    // Only "top" and "bottom" are selectable; anything else (empty, or a legacy
    // "none" from before the position was retired) falls back to "bottom".
    const selectedPosition: OverlayPosition =
      getSetting("overlay_position") === "top" ? "top" : "bottom";

    const borderColor = (getSetting("overlay_border_color") as string) || "";
    const backgroundColor =
      (getSetting("overlay_background_color") as string) || "";
    const borderWidth = Math.min(
      (getSetting("overlay_border_width") as number | undefined) ??
        OVERLAY_LIMITS.borderWidth.default,
      OVERLAY_LIMITS.borderWidth.max,
    );
    const customWidth = Math.min(
      Math.max(
        (getSetting("overlay_custom_width") as number | undefined) ??
          OVERLAY_LIMITS.liveWidth.default,
        OVERLAY_LIMITS.liveWidth.min,
      ),
      OVERLAY_LIMITS.liveWidth.max,
    );
    const customHeight = Math.min(
      Math.max(
        (getSetting("overlay_custom_height") as number | undefined) ??
          OVERLAY_LIMITS.controlHeight.default,
        OVERLAY_LIMITS.controlHeight.min,
      ),
      OVERLAY_LIMITS.controlHeight.max,
    );

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.overlay.style.title")}
          description={t("settings.advanced.overlay.style.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <Dropdown
            options={styleOptions}
            selectedValue={selectedStyle}
            onSelect={(value) =>
              updateSetting("overlay_style", value as OverlayStyle)
            }
            disabled={isUpdating("overlay_style")}
          />
        </SettingContainer>
        {selectedStyle !== "none" && (
          <>
            <SettingContainer
              title={t("settings.advanced.overlay.position.title")}
              description={t("settings.advanced.overlay.position.description")}
              descriptionMode={descriptionMode}
              grouped={grouped}
            >
              <Dropdown
                options={positionOptions}
                selectedValue={selectedPosition}
                onSelect={(value) =>
                  updateSetting("overlay_position", value as OverlayPosition)
                }
                disabled={isUpdating("overlay_position")}
              />
            </SettingContainer>
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
                      max={OVERLAY_LIMITS.borderWidth.max}
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
                          (borderWidth / OVERLAY_LIMITS.borderWidth.max) * 100
                        }%, rgba(128, 128, 128, 0.2) ${
                          (borderWidth / OVERLAY_LIMITS.borderWidth.max) * 100
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
            {selectedStyle === "live" && (
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
                        min={OVERLAY_LIMITS.liveWidth.min}
                        max={OVERLAY_LIMITS.liveWidth.max}
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
                            ((customWidth - OVERLAY_LIMITS.liveWidth.min) /
                              (OVERLAY_LIMITS.liveWidth.max -
                                OVERLAY_LIMITS.liveWidth.min)) *
                            100
                          }%, rgba(128, 128, 128, 0.2) ${
                            ((customWidth - OVERLAY_LIMITS.liveWidth.min) /
                              (OVERLAY_LIMITS.liveWidth.max -
                                OVERLAY_LIMITS.liveWidth.min)) *
                            100
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
                  {customWidth !== OVERLAY_LIMITS.liveWidth.default && (
                    <button
                      onClick={() =>
                        updateSetting(
                          "overlay_custom_width",
                          OVERLAY_LIMITS.liveWidth.default,
                        )
                      }
                      className="text-xs text-mid-gray hover:text-text"
                    >
                      {t("common.reset")}
                    </button>
                  )}
                </div>
              </SettingContainer>
            )}
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
                      min={OVERLAY_LIMITS.controlHeight.min}
                      max={OVERLAY_LIMITS.controlHeight.max}
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
                          ((customHeight - OVERLAY_LIMITS.controlHeight.min) /
                            (OVERLAY_LIMITS.controlHeight.max -
                              OVERLAY_LIMITS.controlHeight.min)) *
                          100
                        }%, rgba(128, 128, 128, 0.2) ${
                          ((customHeight - OVERLAY_LIMITS.controlHeight.min) /
                            (OVERLAY_LIMITS.controlHeight.max -
                              OVERLAY_LIMITS.controlHeight.min)) *
                          100
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
                {customHeight !== OVERLAY_LIMITS.controlHeight.default && (
                  <button
                    onClick={() =>
                      updateSetting(
                        "overlay_custom_height",
                        OVERLAY_LIMITS.controlHeight.default,
                      )
                    }
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
