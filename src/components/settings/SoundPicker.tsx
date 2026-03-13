import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Dropdown, DropdownOption } from "../ui/Dropdown";
import { PlayIcon, FolderOpenIcon, XIcon } from "lucide-react";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettingsStore } from "../../stores/settingsStore";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "@/bindings";
import { open } from "@tauri-apps/plugin-dialog";

interface SoundPickerProps {
  label: string;
  description: string;
}

export const SoundPicker: React.FC<SoundPickerProps> = ({
  label,
  description,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings } = useSettings();
  const playTestSound = useSettingsStore((state) => state.playTestSound);
  const customSounds = useSettingsStore((state) => state.customSounds);
  const checkCustomSounds = useSettingsStore((state) => state.checkCustomSounds);

  const selectedTheme = getSetting("sound_theme") ?? "marimba";
  const customStartSound = getSetting("custom_start_sound");
  const customStopSound = getSetting("custom_stop_sound");

  const options: DropdownOption[] = [
    { value: "marimba", label: "Marimba" },
    { value: "pop", label: "Pop" },
  ];

  if (customSounds.start || customSounds.stop || customStartSound || customStopSound) {
    options.push({ value: "custom", label: t("settings.sound.soundTheme.custom") });
  }

  const handlePlayBothSounds = async () => {
    await playTestSound("start");
    await playTestSound("stop");
  };

  const pickSoundFile = useCallback(
    async (soundType: "start" | "stop") => {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: t("settings.sound.customSounds.audioFiles"),
            extensions: ["wav", "mp3", "ogg", "flac"],
          },
        ],
      });
      if (selected) {
        const result = await commands.setCustomSoundPath(soundType, selected);
        if (result.status === "ok") {
          await checkCustomSounds();
          await refreshSettings();
        }
      }
    },
    [checkCustomSounds, refreshSettings, t],
  );

  const clearCustomSound = useCallback(
    async (soundType: "start" | "stop") => {
      const result = await commands.clearCustomSoundPath(soundType);
      if (result.status === "ok") {
        await checkCustomSounds();
        await refreshSettings();
      }
    },
    [checkCustomSounds, refreshSettings],
  );

  const getFileName = (path: string | null | undefined) => {
    if (!path) return null;
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1];
  };

  return (
    <SettingContainer
      title={label}
      description={description}
      grouped
      layout="horizontal"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Dropdown
            selectedValue={selectedTheme}
            onSelect={(value) =>
              updateSetting(
                "sound_theme",
                value as "marimba" | "pop" | "custom",
              )
            }
            options={options}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayBothSounds}
            title={t("settings.sound.soundTheme.preview")}
          >
            <PlayIcon className="h-4 w-4" />
          </Button>
        </div>
        {selectedTheme === "custom" && (
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground min-w-[32px]">
                {t("settings.sound.customSounds.start")}:
              </span>
              <span
                className="text-muted-foreground truncate max-w-[140px]"
                title={customStartSound ?? undefined}
              >
                {getFileName(customStartSound) ??
                  t("settings.sound.customSounds.default")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => pickSoundFile("start")}
                title={t("settings.sound.customSounds.browse")}
                className="h-6 w-6 p-0"
              >
                <FolderOpenIcon className="h-3.5 w-3.5" />
              </Button>
              {customStartSound && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCustomSound("start")}
                  title={t("settings.sound.customSounds.clear")}
                  className="h-6 w-6 p-0"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground min-w-[32px]">
                {t("settings.sound.customSounds.stop")}:
              </span>
              <span
                className="text-muted-foreground truncate max-w-[140px]"
                title={customStopSound ?? undefined}
              >
                {getFileName(customStopSound) ??
                  t("settings.sound.customSounds.default")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => pickSoundFile("stop")}
                title={t("settings.sound.customSounds.browse")}
                className="h-6 w-6 p-0"
              >
                <FolderOpenIcon className="h-3.5 w-3.5" />
              </Button>
              {customStopSound && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCustomSound("stop")}
                  title={t("settings.sound.customSounds.clear")}
                  className="h-6 w-6 p-0"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingContainer>
  );
};
