import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { useModelStore } from "@/stores/modelStore";
import { SettingContainer } from "../ui/SettingContainer";

const TOKEN_BUDGET = 112; // Half of Whisper's 224-token window

interface TranscriptionPromptProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

/** Per-script token cost estimator (tokens per character). */
const estimateTokens = (text: string): number => {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) {
      // CJK Unified Ideographs
      tokens += 2.2;
    } else if (code >= 0x3040 && code <= 0x30ff) {
      // Hiragana / Katakana
      tokens += 2.2;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      // Cyrillic
      tokens += 0.5;
    } else {
      // Latin and other scripts
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
};

const LANGUAGE_PRESETS: Record<string, string> = {
  none: "",
  english:
    "Use proper English punctuation: periods, commas, question marks, exclamation marks, apostrophes, and quotation marks.",
  spanish:
    "Usa puntuaci\u00f3n espa\u00f1ola correcta: puntos, comas, signos de interrogaci\u00f3n (\u00bf?), signos de exclamaci\u00f3n (\u00a1!), tildes y comillas.",
  french:
    "Utilisez la ponctuation fran\u00e7aise correcte : points, virgules, points d\u2019interrogation, points d\u2019exclamation, accents et guillemets \u00ab \u00bb.",
  german:
    "Verwende korrekte deutsche Zeichensetzung: Punkte, Kommas, Fragezeichen, Ausrufezeichen, Umlaute und Anf\u00fchrungszeichen.",
  portuguese:
    "Use pontua\u00e7\u00e3o portuguesa correta: pontos, v\u00edrgulas, pontos de interroga\u00e7\u00e3o, pontos de exclama\u00e7\u00e3o, acentos e aspas.",
  italian:
    "Usa la punteggiatura italiana corretta: punti, virgole, punti interrogativi, punti esclamativi, accenti e virgolette.",
  russian:
    "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0443\u044e \u0440\u0443\u0441\u0441\u043a\u0443\u044e \u043f\u0443\u043d\u043a\u0442\u0443\u0430\u0446\u0438\u044e: \u0442\u043e\u0447\u043a\u0438, \u0437\u0430\u043f\u044f\u0442\u044b\u0435, \u0432\u043e\u043f\u0440\u043e\u0441\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0438 \u0432\u043e\u0441\u043a\u043b\u0438\u0446\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0437\u043d\u0430\u043a\u0438, \u043a\u0430\u0432\u044b\u0447\u043a\u0438 \u00ab \u00bb.",
  japanese:
    "\u6b63\u3057\u3044\u65e5\u672c\u8a9e\u306e\u53e5\u8aad\u70b9\u3092\u4f7f\u7528\u3057\u3066\u304f\u3060\u3055\u3044\uff1a\u53e5\u70b9\u3001\u8aad\u70b9\u3001\u62ec\u5f27\u3001\u304b\u304e\u62ec\u5f27\u3002",
  chineseSimplified:
    "\u4f7f\u7528\u6b63\u786e\u7684\u4e2d\u6587\u6807\u70b9\u7b26\u53f7\uff1a\u53e5\u53f7\u3001\u9017\u53f7\u3001\u95ee\u53f7\u3001\u611f\u53f9\u53f7\u3001\u5f15\u53f7\u201c\u201d\u3002",
  chineseTraditional:
    "\u4f7f\u7528\u6b63\u78ba\u7684\u4e2d\u6587\u6a19\u9ede\u7b26\u865f\uff1a\u53e5\u865f\u3001\u9017\u865f\u3001\u554f\u865f\u3001\u9a5a\u5606\u865f\u3001\u5f15\u865f\u300c\u300d\u3002",
};

export const TranscriptionPrompt: React.FC<TranscriptionPromptProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const { models, currentModel } = useModelStore();

    const currentValue =
      (getSetting("transcription_prompt") as string | null) ?? null;
    const [localValue, setLocalValue] = useState(currentValue ?? "");
    const [selectedPreset, setSelectedPreset] = useState("none");

    useEffect(() => {
      setLocalValue(currentValue ?? "");
    }, [currentValue]);

    const tokenCount = useMemo(() => estimateTokens(localValue), [localValue]);
    const usagePercent = Math.min((tokenCount / TOKEN_BUDGET) * 100, 100);

    const progressColor =
      usagePercent >= 95
        ? "bg-red-500"
        : usagePercent >= 80
          ? "bg-yellow-500"
          : "bg-mid-gray/40";

    const isWhisperModel = useMemo(() => {
      const model = models.find((m) => m.id === currentModel);
      return model?.engine_type === "Whisper";
    }, [models, currentModel]);

    const isAutoLanguage = getSetting("selected_language") === "auto";

    const handleBlur = useCallback(() => {
      const trimmed = localValue.trim();
      const newValue = trimmed === "" ? null : trimmed;
      if (newValue !== currentValue) {
        updateSetting("transcription_prompt", newValue);
      }
    }, [localValue, currentValue, updateSetting]);

    const handlePresetChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetKey = e.target.value;
        setSelectedPreset(presetKey);
        const presetText = LANGUAGE_PRESETS[presetKey] ?? "";
        setLocalValue(presetText);
        const newValue = presetText === "" ? null : presetText;
        if (newValue !== currentValue) {
          updateSetting("transcription_prompt", newValue);
        }
      },
      [currentValue, updateSetting],
    );

    return (
      <SettingContainer
        title={t("settings.advanced.transcriptionPrompt.title")}
        description={t("settings.advanced.transcriptionPrompt.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <div className="w-full max-w-80 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text/50 shrink-0">
              {t("settings.advanced.transcriptionPrompt.presets")}
            </label>
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-logo-primary"
            >
              <option value="none">
                {t("settings.advanced.transcriptionPrompt.presetNone")}
              </option>
              <option value="english">
                {t("settings.advanced.transcriptionPrompt.presetEnglish")}
              </option>
              <option value="spanish">
                {t("settings.advanced.transcriptionPrompt.presetSpanish")}
              </option>
              <option value="french">
                {t("settings.advanced.transcriptionPrompt.presetFrench")}
              </option>
              <option value="german">
                {t("settings.advanced.transcriptionPrompt.presetGerman")}
              </option>
              <option value="portuguese">
                {t("settings.advanced.transcriptionPrompt.presetPortuguese")}
              </option>
              <option value="italian">
                {t("settings.advanced.transcriptionPrompt.presetItalian")}
              </option>
              <option value="russian">
                {t("settings.advanced.transcriptionPrompt.presetRussian")}
              </option>
              <option value="japanese">
                {t("settings.advanced.transcriptionPrompt.presetJapanese")}
              </option>
              <option value="chineseSimplified">
                {t(
                  "settings.advanced.transcriptionPrompt.presetChineseSimplified",
                )}
              </option>
              <option value="chineseTraditional">
                {t(
                  "settings.advanced.transcriptionPrompt.presetChineseTraditional",
                )}
              </option>
            </select>
          </div>

          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-text placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary resize-y min-h-[60px]"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={t(
              "settings.advanced.transcriptionPrompt.placeholder",
            )}
            rows={3}
            disabled={isUpdating("transcription_prompt")}
          />

          {/* Token budget bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text/40">
                {t("settings.advanced.transcriptionPrompt.tokenBudget", {
                  used: tokenCount,
                  total: TOKEN_BUDGET,
                })}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-mid-gray/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          {/* Warnings */}
          {!isWhisperModel && currentModel && (
            <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
              {t("settings.advanced.transcriptionPrompt.warningNonWhisper")}
            </p>
          )}
          {isAutoLanguage && localValue && (
            <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
              {t("settings.advanced.transcriptionPrompt.warningAutoLanguage")}
            </p>
          )}
        </div>
      </SettingContainer>
    );
  });
