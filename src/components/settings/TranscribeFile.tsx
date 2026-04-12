import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import { Button } from "../ui/Button";
import { SettingsGroup } from "../ui/SettingsGroup";
import { FileAudio, Copy, Check, Loader2 } from "lucide-react";

type TranscriptionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loading_model" }
  | { kind: "transcribing" }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string };

export const TranscribeFile: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<TranscriptionState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleTranscribeFile = useCallback(async () => {
    try {
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: t("settings.general.transcribeFile.audioFiles"),
            extensions: ["wav"],
          },
        ],
      });

      if (!filePath) return;

      setState({ kind: "loading" });

      const unlisten = await listen<string>(
        "file-transcription-progress",
        (event) => {
          switch (event.payload) {
            case "loading":
              setState({ kind: "loading" });
              break;
            case "loading_model":
              setState({ kind: "loading_model" });
              break;
            case "transcribing":
              setState({ kind: "transcribing" });
              break;
            case "done":
              break;
          }
        },
      );

      const result = await commands.transcribeFile(filePath);
      unlisten();

      if (result.status === "ok") {
        if (result.data && result.data.trim().length > 0) {
          setState({ kind: "done", text: result.data });
        } else {
          setState({
            kind: "error",
            message: t("settings.general.transcribeFile.noResult"),
          });
        }
      } else {
        setState({
          kind: "error",
          message: t("settings.general.transcribeFile.error", {
            error: result.error,
          }),
        });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: t("settings.general.transcribeFile.error", {
          error: String(err),
        }),
      });
    }
  }, [t]);

  const handleCopy = useCallback(async () => {
    if (state.kind === "done") {
      try {
        await navigator.clipboard.writeText(state.text);
        setCopied(true);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [state]);

  const isProcessing =
    state.kind === "loading" ||
    state.kind === "loading_model" ||
    state.kind === "transcribing";

  const getStatusText = () => {
    switch (state.kind) {
      case "loading":
        return t("settings.general.transcribeFile.loadingFile");
      case "loading_model":
        return t("settings.general.transcribeFile.loadingModel");
      case "transcribing":
        return t("settings.general.transcribeFile.transcribing");
      default:
        return "";
    }
  };

  return (
    <SettingsGroup
      title={t("settings.general.transcribeFile.title")}
      description={t("settings.general.transcribeFile.description")}
    >
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleTranscribeFile}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {getStatusText()}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                {t("settings.general.transcribeFile.button")}
              </span>
            )}
          </Button>
          <span className="text-xs text-mid-gray">
            {t("settings.general.transcribeFile.supportedFormats")}
          </span>
        </div>

        {state.kind === "done" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-mid-gray uppercase tracking-wide">
                {t("settings.general.transcribeFile.result")}
              </span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {t("settings.general.transcribeFile.copied")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    {t("settings.general.transcribeFile.copy")}
                  </span>
                )}
              </Button>
            </div>
            <div className="bg-mid-gray/10 border border-mid-gray/20 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap select-text">
                {state.text}
              </p>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm text-red-400">{state.message}</p>
          </div>
        )}
      </div>
    </SettingsGroup>
  );
};
