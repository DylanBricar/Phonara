import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AudioPlayer } from "../../ui/AudioPlayer";
import { Button } from "../../ui/Button";
import {
  Copy,
  Star,
  Check,
  Trash2,
  FolderOpen,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { commands, type HistoryEntry } from "@/bindings";
import { formatDateTime } from "@/utils/dateFormat";
import { useModelStore } from "@/stores/modelStore";

interface OpenRecordingsButtonProps {
  onClick: () => void;
  label: string;
}

const OpenRecordingsButton: React.FC<OpenRecordingsButtonProps> = ({
  onClick,
  label,
}) => (
  <Button
    onClick={onClick}
    variant="secondary"
    size="sm"
    className="flex items-center gap-2"
    title={label}
  >
    <FolderOpen className="w-4 h-4" />
    <span>{label}</span>
  </Button>
);

export const HistorySettings: React.FC = () => {
  const { t } = useTranslation();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistoryEntries = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok") {
        setHistoryEntries(result.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryEntries();
    const unlistenPromise = listen("history-updated", () => {
      loadHistoryEntries();
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [loadHistoryEntries]);

  const toggleSaved = useCallback(async (id: number) => {
    try {
      await commands.toggleHistoryEntrySaved(id);
    } catch {
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
    }
  }, []);

  const getAudioUrl = useCallback(
    async (fileName: string) => {
      try {
        const result = await commands.getAudioFilePath(fileName);
        if (result.status === "ok") {
          const binaryStr = atob(result.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "audio/wav" });
          return URL.createObjectURL(blob);
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  const deleteAudioEntry = useCallback(async (id: number) => {
    await commands.deleteHistoryEntry(id);
  }, []);

  const openRecordingsFolder = async () => {
    try {
      await commands.openRecordingsFolder();
    } catch {
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="space-y-2">
          <div className="px-4 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-mid-gray uppercase tracking-wide">
                {t("settings.history.title")}
              </h2>
            </div>
            <OpenRecordingsButton
              onClick={openRecordingsFolder}
              label={t("settings.history.openFolder")}
            />
          </div>
          <div className="bg-background border border-mid-gray/20 rounded-lg overflow-visible">
            <div className="px-4 py-3 text-center text-text/60">
              {t("settings.history.loading")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (historyEntries.length === 0) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="space-y-2">
          <div className="px-4 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-mid-gray uppercase tracking-wide">
                {t("settings.history.title")}
              </h2>
            </div>
            <OpenRecordingsButton
              onClick={openRecordingsFolder}
              label={t("settings.history.openFolder")}
            />
          </div>
          <div className="bg-background border border-mid-gray/20 rounded-lg overflow-visible">
            <div className="px-4 py-3 text-center text-text/60">
              {t("settings.history.empty")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="space-y-2">
        <div className="px-4 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium text-mid-gray uppercase tracking-wide">
              {t("settings.history.title")}
            </h2>
          </div>
          <OpenRecordingsButton
            onClick={openRecordingsFolder}
            label={t("settings.history.openFolder")}
          />
        </div>
        <div className="bg-background border border-mid-gray/20 rounded-lg overflow-visible">
          <div className="divide-y divide-mid-gray/20">
            {historyEntries.map((entry) => (
              <HistoryEntryComponent
                key={entry.id}
                entry={entry}
                onToggleSaved={toggleSaved}
                onCopyText={copyToClipboard}
                getAudioUrl={getAudioUrl}
                deleteAudio={deleteAudioEntry}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface HistoryEntryProps {
  entry: HistoryEntry;
  onToggleSaved: (id: number) => void;
  onCopyText: (text: string) => void;
  getAudioUrl: (fileName: string) => Promise<string | null>;
  deleteAudio: (id: number) => Promise<void>;
}

const HistoryEntryComponent: React.FC<HistoryEntryProps> = React.memo(({
  entry,
  onToggleSaved,
  onCopyText,
  getAudioUrl,
  deleteAudio,
}) => {
  const { t, i18n } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const models = useModelStore((s) => s.models);

  const downloadedModels = useMemo(() => models.filter((m) => m.is_downloaded), [models]);

  const handleLoadAudio = useCallback(
    () => getAudioUrl(entry.file_name),
    [getAudioUrl, entry.file_name],
  );

  const handleToggleSaved = useCallback(() => {
    onToggleSaved(entry.id);
  }, [onToggleSaved, entry.id]);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { clearTimeout(copiedTimerRef.current); };
  }, []);

  const handleCopyText = useCallback(() => {
    onCopyText(entry.post_processed_text ?? entry.transcription_text);
    setShowCopied(true);
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setShowCopied(false), 2000);
  }, [onCopyText, entry.post_processed_text, entry.transcription_text]);

  const handleDeleteEntry = async () => {
    try {
      await deleteAudio(entry.id);
    } catch {
    }
  };

  const handleReprocess = async (modelId: string) => {
    setShowModelPicker(false);
    setReprocessing(true);
    try {
      await commands.reprocessHistoryEntry(entry.id, modelId);
    } catch {
    } finally {
      setReprocessing(false);
    }
  };

  useEffect(() => {
    if (!showModelPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModelPicker]);

  const formattedDate = formatDateTime(String(entry.timestamp), i18n.language);

  return (
    <div className="px-4 py-2 pb-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{formattedDate}</p>
          {entry.model_name && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-mid-gray/10 text-text/50 font-medium">
              {entry.model_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() =>
                !reprocessing && setShowModelPicker(!showModelPicker)
              }
              disabled={reprocessing}
              className="p-2 rounded-md text-text/50 hover:text-logo-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                reprocessing
                  ? t("settings.history.reprocessing")
                  : t("settings.history.reprocess")
              }
            >
              {reprocessing ? (
                <Loader2 width={16} height={16} className="animate-spin" />
              ) : (
                <RefreshCw width={16} height={16} />
              )}
            </button>
            {showModelPicker && downloadedModels.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-mid-gray/20 rounded-lg shadow-lg py-1 min-w-[200px]">
                <p className="px-3 py-1 text-xs text-text/50 font-medium">
                  {t("settings.history.selectModel")}
                </p>
                {downloadedModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleReprocess(model.id)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-mid-gray/10 transition-colors cursor-pointer"
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleCopyText}
            className="text-text/50 hover:text-logo-primary  hover:border-logo-primary transition-colors cursor-pointer"
            title={t("settings.history.copyToClipboard")}
          >
            {showCopied ? (
              <Check width={16} height={16} />
            ) : (
              <Copy width={16} height={16} />
            )}
          </button>
          <button
            onClick={handleToggleSaved}
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              entry.saved
                ? "text-logo-primary hover:text-logo-primary/80"
                : "text-text/50 hover:text-logo-primary"
            }`}
            title={
              entry.saved
                ? t("settings.history.unsave")
                : t("settings.history.save")
            }
          >
            <Star
              width={16}
              height={16}
              fill={entry.saved ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={handleDeleteEntry}
            className="text-text/50 hover:text-logo-primary transition-colors cursor-pointer"
            title={t("settings.history.delete")}
          >
            <Trash2 width={16} height={16} />
          </button>
        </div>
      </div>
      {entry.post_processed_text ? (
        <div className="space-y-2 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-text/50">
                {t("settings.history.postProcessed")}
              </span>
              {entry.post_process_action_key != null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-logo-primary/10 text-logo-primary font-medium">
                  {t("settings.history.action", {
                    key: entry.post_process_action_key,
                  })}
                </span>
              )}
            </div>
            <p className="italic text-text/90 text-sm select-text cursor-text">
              {entry.post_processed_text}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-text/50 mb-0.5 block">
              {t("settings.history.originalTranscript")}
            </span>
            <p className="italic text-text/50 text-sm select-text cursor-text">
              {entry.transcription_text}
            </p>
          </div>
        </div>
      ) : (
        <p className="italic text-text/90 text-sm pb-2 select-text cursor-text">
          {entry.transcription_text}
        </p>
      )}
      <AudioPlayer onLoadRequest={handleLoadAudio} className="w-full" />
    </div>
  );
});
