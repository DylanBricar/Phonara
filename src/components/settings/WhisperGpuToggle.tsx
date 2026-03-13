import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface WhisperGpuToggleProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const WhisperGpuToggle: React.FC<WhisperGpuToggleProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const whisperUseGpu = getSetting("whisper_use_gpu") ?? true;

    return (
      <ToggleSwitch
        checked={whisperUseGpu}
        onChange={(enabled) => updateSetting("whisper_use_gpu", enabled)}
        isUpdating={isUpdating("whisper_use_gpu")}
        label={t("settings.modelSettings.gpuAcceleration.label")}
        description={t("settings.modelSettings.gpuAcceleration.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  },
);
