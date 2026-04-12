import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { SettingContainer } from "../ui/SettingContainer";
import { Button } from "../ui/Button";
import { FolderOpen, RotateCcw } from "lucide-react";
import { commands } from "@/bindings";
import { useSettings } from "../../hooks/useSettings";

interface RecordingsDirectoryProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const RecordingsDirectory: React.FC<RecordingsDirectoryProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, refreshSettings } = useSettings();
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showRestart, setShowRestart] = useState(false);

    const customDir = getSetting("custom_recordings_directory") as
      | string
      | null
      | undefined;

    useEffect(() => {
      const loadPath = async () => {
        const result = await commands.getRecordingsDirectory();
        if (result.status === "ok") {
          setCurrentPath(result.data);
        }
      };
      loadPath();
    }, [customDir]);

    const handleChooseFolder = async () => {
      try {
        const selected = await open({
          directory: true,
          multiple: false,
          title: t("settings.debug.recordingsDirectory.choose"),
        });

        if (selected && typeof selected === "string") {
          setIsUpdating(true);
          const result = await commands.setRecordingsDirectory(selected);
          if (result.status === "ok") {
            await refreshSettings();
            setShowRestart(true);
          }
          setIsUpdating(false);
        }
      } catch {
        setIsUpdating(false);
      }
    };

    const handleReset = async () => {
      setIsUpdating(true);
      try {
        const result = await commands.clearRecordingsDirectory();
        if (result.status === "ok") {
          await refreshSettings();
          setShowRestart(true);
        }
      } catch {}
      setIsUpdating(false);
    };

    return (
      <SettingContainer
        title={t("settings.debug.recordingsDirectory.title")}
        description={t("settings.debug.recordingsDirectory.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleChooseFolder}
              variant="secondary"
              size="sm"
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{t("settings.debug.recordingsDirectory.choose")}</span>
            </Button>
            {customDir && (
              <Button
                onClick={handleReset}
                variant="secondary"
                size="sm"
                disabled={isUpdating}
                className="flex items-center gap-2"
                title={t("settings.debug.recordingsDirectory.reset")}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t("settings.debug.recordingsDirectory.reset")}</span>
              </Button>
            )}
          </div>
          {currentPath && (
            <p className="text-xs text-text/50 truncate" title={currentPath}>
              {customDir
                ? t("settings.debug.recordingsDirectory.current", {
                    path: currentPath,
                  })
                : t("settings.debug.recordingsDirectory.default")}
            </p>
          )}
          {showRestart && (
            <p className="text-xs text-yellow-500">
              {t("settings.debug.recordingsDirectory.restartNote")}
            </p>
          )}
        </div>
      </SettingContainer>
    );
  });

RecordingsDirectory.displayName = "RecordingsDirectory";
