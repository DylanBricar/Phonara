import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import type { ModelInfo } from "@/bindings";
import { ProcessingModelsSection } from "./ProcessingModelsSection";
import { GeminiKeyDialog, OpenaiKeyDialog } from "./ApiKeyDialogs";
import { LanguageFilterDropdown } from "./LanguageFilterDropdown";

const modelSupportsLanguage = (model: ModelInfo, langCode: string): boolean => {
  return model.supported_languages.includes(langCode);
};

type ModelsTab = "transcription" | "processing";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ModelsTab>("transcription");
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [showGeminiKeyDialog, setShowGeminiKeyDialog] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiModelInput, setGeminiModelInput] = useState("");
  const [showOpenaiKeyDialog, setShowOpenaiKeyDialog] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [openaiModelInput, setOpenaiModelInput] = useState("");
  const { getSetting, updateSetting } = useSettings();
  const {
    models,
    currentModel,
    downloadingModels,
    downloadProgress,
    downloadStats,
    verifyingModels,
    extractingModels,
    loading,
    downloadModel,
    cancelDownload,
    selectModel,
    deleteModel,
  } = useModelStore();

  const geminiApiKey = getSetting("gemini_api_key") as string | undefined;
  const hasGeminiKey = !!geminiApiKey && geminiApiKey.length > 0;
  const openaiApiKey = getSetting("openai_api_key") as string | undefined;
  const hasOpenaiKey = !!openaiApiKey && openaiApiKey.length > 0;

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) {
      return "extracting";
    }
    if (modelId in verifyingModels) {
      return "verifying";
    }
    if (modelId in downloadingModels) {
      return "downloading";
    }
    if (switchingModelId === modelId) {
      return "switching";
    }
    if (modelId === currentModel) {
      if (modelId === "gemini-api" && !hasGeminiKey) return "available";
      if (modelId === "openai-api" && !hasOpenaiKey) return "available";
      return "active";
    }
    const model = models.find((m: ModelInfo) => m.id === modelId);
    if (model?.is_downloaded) return "available";
    return "downloadable";
  };

  const handleModelSelect = async (modelId: string) => {
    if (modelId === "gemini-api") {
      setGeminiKeyInput(hasGeminiKey ? (geminiApiKey || "") : "");
      setGeminiModelInput((getSetting("gemini_model") as string) || "gemini-2.0-flash");
      setShowGeminiKeyDialog(true);
      return;
    }
    if (modelId === "openai-api") {
      setOpenaiKeyInput(hasOpenaiKey ? (openaiApiKey || "") : "");
      setOpenaiModelInput((getSetting("openai_model") as string) || "gpt-4o-mini-transcribe");
      setShowOpenaiKeyDialog(true);
      return;
    }
    setSwitchingModelId(modelId);
    try {
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleGeminiKeySave = async () => {
    const key = geminiKeyInput.trim();
    if (!key) return;
    await updateSetting("gemini_api_key", key);
    if (geminiModelInput) {
      await updateSetting("gemini_model", geminiModelInput);
    }
    setShowGeminiKeyDialog(false);
    setSwitchingModelId("gemini-api");
    try {
      await selectModel("gemini-api");
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleOpenaiKeySave = async () => {
    const key = openaiKeyInput.trim();
    if (!key) return;
    await updateSetting("openai_api_key", key);
    if (openaiModelInput) {
      await updateSetting("openai_model", openaiModelInput);
    }
    setShowOpenaiKeyDialog(false);
    setSwitchingModelId("openai-api");
    try {
      await selectModel("openai-api");
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleModelDownload = useCallback(async (modelId: string) => {
    await downloadModel(modelId);
  }, [downloadModel]);

  const handleModelDelete = useCallback(async (modelId: string) => {
    const model = models.find((m: ModelInfo) => m.id === modelId);
    const modelName = model?.name || modelId;
    const isActive = modelId === currentModel;

    const confirmed = await ask(
      isActive
        ? t("settings.models.deleteActiveConfirm", { modelName })
        : t("settings.models.deleteConfirm", { modelName }),
      {
        title: t("settings.models.deleteTitle"),
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await deleteModel(modelId);
      } catch {
        }
    }
  }, [models, currentModel, t, deleteModel]);

  const handleModelCancel = useCallback(async (modelId: string) => {
    try {
      await cancelDownload(modelId);
    } catch {
    }
  }, [cancelDownload]);

  const filteredModels = useMemo(() => {
    return models.filter((model: ModelInfo) => {
      if (languageFilter !== "all") {
        if (!modelSupportsLanguage(model, languageFilter)) return false;
      }
      return true;
    });
  }, [models, languageFilter]);

  const { downloadedModels, availableModels } = useMemo(() => {
    const downloaded: ModelInfo[] = [];
    const available: ModelInfo[] = [];

    for (const model of filteredModels) {
      const isCloudWithoutKey =
        (model.id === "gemini-api" && !hasGeminiKey) ||
        (model.id === "openai-api" && !hasOpenaiKey);
      if (
        !isCloudWithoutKey &&
        (model.is_custom ||
          model.is_downloaded ||
          model.id in downloadingModels ||
          model.id in extractingModels)
      ) {
        downloaded.push(model);
      } else {
        available.push(model);
      }
    }

    downloaded.sort((a, b) => {
      if (a.id === currentModel) return -1;
      if (b.id === currentModel) return 1;
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return 0;
    });

    return { downloadedModels: downloaded, availableModels: available };
  }, [
    filteredModels,
    downloadingModels,
    extractingModels,
    currentModel,
    hasGeminiKey,
    hasOpenaiKey,
  ]);

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-logo-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold mb-2">
          {t("settings.models.title")}
        </h1>
        <div className="flex gap-1 mt-3 p-0.5 bg-mid-gray/10 rounded-lg w-fit">
          {(["transcription", "processing"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-background text-text shadow-sm"
                  : "text-text/50 hover:text-text/70"
              }`}
            >
              {t(`settings.models.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "processing" && <ProcessingModelsSection />}

      {activeTab === "transcription" && filteredModels.length > 0 ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text/60">
                {t("settings.models.yourModels")}
              </h2>
              <LanguageFilterDropdown
                value={languageFilter}
                onChange={setLanguageFilter}
              />
            </div>
            {downloadedModels.map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                status={getModelStatus(model.id)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={downloadProgress[model.id]?.percentage}
                downloadSpeed={downloadStats[model.id]?.speed}
                showRecommended={true}
              />
            ))}
          </div>

          {availableModels.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text/60">
                {t("settings.models.availableModels")}
              </h2>
              {availableModels.map((model: ModelInfo) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  status={getModelStatus(model.id)}
                  onSelect={handleModelSelect}
                  onDownload={handleModelDownload}
                  onDelete={handleModelDelete}
                  onCancel={handleModelCancel}
                  downloadProgress={downloadProgress[model.id]?.percentage}
                  downloadSpeed={downloadStats[model.id]?.speed}
                  showRecommended={true}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "transcription" ? (
        <div className="text-center py-8 text-text/50">
          {t("settings.models.noModelsMatch")}
        </div>
      ) : null}

      {showGeminiKeyDialog && (
        <GeminiKeyDialog
          keyInput={geminiKeyInput}
          modelInput={geminiModelInput}
          onKeyChange={setGeminiKeyInput}
          onModelChange={setGeminiModelInput}
          onSave={handleGeminiKeySave}
          onClose={() => setShowGeminiKeyDialog(false)}
        />
      )}

      {showOpenaiKeyDialog && (
        <OpenaiKeyDialog
          keyInput={openaiKeyInput}
          modelInput={openaiModelInput}
          onKeyChange={setOpenaiKeyInput}
          onModelChange={setOpenaiModelInput}
          onSave={handleOpenaiKeySave}
          onClose={() => setShowOpenaiKeyDialog(false)}
        />
      )}
    </div>
  );
};
