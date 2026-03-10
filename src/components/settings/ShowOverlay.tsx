import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";
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

    const highVisibility = getSetting("overlay_high_visibility") ?? false;

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
          <ToggleSwitch
            checked={highVisibility}
            onChange={(enabled) =>
              updateSetting("overlay_high_visibility", enabled)
            }
            isUpdating={isUpdating("overlay_high_visibility")}
            label={t("settings.advanced.overlay.highVisibility.label")}
            description={t(
              "settings.advanced.overlay.highVisibility.description",
            )}
            descriptionMode={descriptionMode}
            grouped={grouped}
          />
        )}
      </>
    );
  },
);
