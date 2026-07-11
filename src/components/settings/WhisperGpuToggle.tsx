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
    const { getSetting, updateTranscribeAcceleration, isUpdating, isLoading } =
      useSettings();

    const accelerator = getSetting("transcribe_accelerator") ?? "auto";
    const handleChange = async (enabled: boolean) => {
      await updateTranscribeAcceleration(
        enabled ? "gpu" : "cpu",
        enabled ? 0 : -1,
      );
    };

    return (
      <ToggleSwitch
        checked={accelerator !== "cpu"}
        onChange={handleChange}
        disabled={isLoading}
        isUpdating={
          isUpdating("transcribe_accelerator") ||
          isUpdating("transcribe_gpu_device")
        }
        label={t("settings.modelSettings.gpuAcceleration.label")}
        description={t("settings.modelSettings.gpuAcceleration.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  },
);
