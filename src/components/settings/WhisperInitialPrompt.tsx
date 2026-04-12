import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { Input } from "../ui/Input";
import { SettingContainer } from "../ui/SettingContainer";

interface WhisperInitialPromptProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const WhisperInitialPrompt: React.FC<WhisperInitialPromptProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const currentValue = getSetting("whisper_initial_prompt") ?? null;
    const [localValue, setLocalValue] = useState(currentValue ?? "");

    useEffect(() => {
      setLocalValue(currentValue ?? "");
    }, [currentValue]);

    const handleBlur = useCallback(() => {
      const trimmed = localValue.trim();
      const newValue = trimmed === "" ? null : trimmed;
      if (newValue !== currentValue) {
        updateSetting("whisper_initial_prompt", newValue);
      }
    }, [localValue, currentValue, updateSetting]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleBlur();
        }
      },
      [handleBlur],
    );

    return (
      <SettingContainer
        title={t("settings.advanced.whisperInitialPrompt.title")}
        description={t("settings.advanced.whisperInitialPrompt.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Input
          type="text"
          className="w-full max-w-80"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={t("settings.advanced.whisperInitialPrompt.placeholder")}
          variant="compact"
          disabled={isUpdating("whisper_initial_prompt")}
        />
      </SettingContainer>
    );
  });
