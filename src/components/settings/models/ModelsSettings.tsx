import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronDown, Globe, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { LANGUAGES } from "@/lib/constants/languages.ts";
import type { ModelInfo } from "@/bindings";
import { commands } from "@/bindings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown, Select } from "@/components/ui";

// check if model supports a language based on its supported_languages list
const modelSupportsLanguage = (model: ModelInfo, langCode: string): boolean => {
  return model.supported_languages.includes(langCode);
};

const LanguageModelsSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    refreshSettings,
    fetchPostProcessModels,
    updatePostProcessApiKey,
    postProcessModelOptions,
  } = useSettings();

  const providers = settings?.post_process_providers || [];
  const savedModels = settings?.llm_models || [];
  const apiKeys = settings?.post_process_api_keys || {};

  const providerOptions = useMemo(
    () => providers.map((p) => ({ value: p.id, label: p.label })),
    [providers],
  );

  const [isAdding, setIsAdding] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [model, setModel] = useState("");
  const [label, setLabel] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAppleIntelligence = providerId === "apple_intelligence";
  const currentApiKey = apiKeys[providerId] || "";
  const fetchedModels = postProcessModelOptions[providerId] || [];
  const modelSelectOptions = useMemo(
    () => fetchedModels.map((m) => ({ value: m, label: m })),
    [fetchedModels],
  );

  const providerLabel = useCallback(
    (id: string) => providers.find((p) => p.id === id)?.label || id,
    [providers],
  );

  const resetForm = useCallback(() => {
    setIsAdding(false);
    setProviderId("");
    setApiKeyInput("");
    setModel("");
    setLabel("");
    setError(null);
  }, []);

  const startAdding = useCallback(() => {
    const first =
      providerOptions.find((p) => p.value !== "apple_intelligence")?.value ||
      providerOptions[0]?.value ||
      "";
    setProviderId(first);
    setApiKeyInput(apiKeys[first] || "");
    setModel("");
    setLabel("");
    setError(null);
    setIsAdding(true);
  }, [providerOptions, apiKeys]);

  const handleProviderChange = useCallback(
    (id: string) => {
      setProviderId(id);
      setApiKeyInput(apiKeys[id] || "");
      setModel("");
    },
    [apiKeys],
  );

  const handleApiKeyBlur = useCallback(async () => {
    if (!providerId || apiKeyInput === currentApiKey) return;
    await updatePostProcessApiKey(providerId, apiKeyInput.trim());
  }, [apiKeyInput, currentApiKey, providerId, updatePostProcessApiKey]);

  const handleFetchModels = useCallback(async () => {
    if (!providerId) return;
    if (apiKeyInput.trim() && apiKeyInput !== currentApiKey) {
      await updatePostProcessApiKey(providerId, apiKeyInput.trim());
    }
    setIsFetching(true);
    setError(null);
    try {
      await fetchPostProcessModels(providerId);
    } finally {
      setIsFetching(false);
    }
  }, [
    providerId,
    apiKeyInput,
    currentApiKey,
    fetchPostProcessModels,
    updatePostProcessApiKey,
  ]);

  const handleSave = useCallback(async () => {
    if (!providerId || !model.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (apiKeyInput.trim() && apiKeyInput !== currentApiKey) {
        await updatePostProcessApiKey(providerId, apiKeyInput.trim());
      }
      const result = await commands.addLlmModel(
        providerId,
        model.trim(),
        label.trim(),
      );
      if (result.status === "ok") {
        await refreshSettings();
        resetForm();
      } else {
        setError(String(result.error));
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    providerId,
    model,
    label,
    apiKeyInput,
    currentApiKey,
    updatePostProcessApiKey,
    refreshSettings,
    resetForm,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await commands.deleteLlmModel(id);
      if (result.status === "ok") {
        await refreshSettings();
      }
    },
    [refreshSettings],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-text/60">
        {t("settings.models.languageModels.description")}
      </p>

      {savedModels.length > 0 && (
        <div className="space-y-2">
          {savedModels.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-lg border border-mid-gray/20 bg-mid-gray/5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{m.label}</p>
                <p className="text-xs text-text/50 truncate">
                  {providerLabel(m.provider_id)} · {m.model}
                </p>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-1.5 rounded-md text-text/50 hover:text-red-500 transition-colors shrink-0"
                title={t("common.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isAdding ? (
        <Button
          onClick={startAdding}
          variant="secondary"
          size="md"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("settings.models.languageModels.addModel")}
        </Button>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-logo-primary/40 bg-mid-gray/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {t("settings.models.languageModels.addModel")}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 rounded-md text-text/50 hover:text-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">
              {t("settings.models.languageModels.provider")}
            </label>
            <Dropdown
              selectedValue={providerId || null}
              options={providerOptions}
              onSelect={handleProviderChange}
              placeholder={t("settings.models.languageModels.provider")}
            />
          </div>

          {!isAppleIntelligence && (
            <div className="space-y-1">
              <label className="text-sm font-semibold">
                {t("settings.models.languageModels.apiKey")}
              </label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onBlur={handleApiKeyBlur}
                placeholder={t(
                  "settings.models.languageModels.apiKeyPlaceholder",
                )}
                variant="compact"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold">
              {t("settings.models.languageModels.model")}
            </label>
            <div className="flex items-center gap-2">
              <Select
                className="flex-1"
                value={model || null}
                options={modelSelectOptions}
                isCreatable
                isLoading={isFetching}
                onChange={(value) => setModel(value ?? "")}
                onCreateOption={(value) => setModel(value)}
                placeholder={t(
                  "settings.models.languageModels.modelPlaceholder",
                )}
                formatCreateLabel={(input) =>
                  t("settings.models.languageModels.useModel", { model: input })
                }
              />
              {!isAppleIntelligence && (
                <button
                  onClick={handleFetchModels}
                  disabled={isFetching || !providerId}
                  className="flex items-center justify-center h-8 w-8 rounded-md bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:opacity-40 shrink-0"
                  title={t("settings.models.languageModels.fetchModels")}
                >
                  <RefreshCcw
                    className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">
              {t("settings.models.languageModels.label")}
            </label>
            <Input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("settings.models.languageModels.labelPlaceholder")}
              variant="compact"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              disabled={!model.trim() || isSaving}
            >
              {t("common.save")}
            </Button>
            <Button onClick={resetForm} variant="secondary" size="md">
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

type ModelsTab = "transcription" | "processing";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ModelsTab>("transcription");
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const languageSearchInputRef = useRef<HTMLInputElement>(null);
  const models = useModelStore((state) => state.models);
  const currentModel = useModelStore((state) => state.currentModel);
  const downloadingModels = useModelStore((state) => state.downloadingModels);
  const downloadProgress = useModelStore((state) => state.downloadProgress);
  const downloadStats = useModelStore((state) => state.downloadStats);
  const verifyingModels = useModelStore((state) => state.verifyingModels);
  const extractingModels = useModelStore((state) => state.extractingModels);
  const loading = useModelStore((state) => state.loading);
  const downloadModel = useModelStore((state) => state.downloadModel);
  const cancelDownload = useModelStore((state) => state.cancelDownload);
  const selectModel = useModelStore((state) => state.selectModel);
  const deleteModel = useModelStore((state) => state.deleteModel);

  // click outside handler for language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setLanguageDropdownOpen(false);
        setLanguageSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // focus search input when dropdown opens
  useEffect(() => {
    if (languageDropdownOpen && languageSearchInputRef.current) {
      languageSearchInputRef.current.focus();
    }
  }, [languageDropdownOpen]);

  // filtered languages for dropdown (exclude "auto")
  const filteredLanguages = useMemo(() => {
    return LANGUAGES.filter(
      (lang) =>
        lang.value !== "auto" &&
        lang.label.toLowerCase().includes(languageSearch.toLowerCase()),
    );
  }, [languageSearch]);

  // Get selected language label
  const selectedLanguageLabel = useMemo(() => {
    if (languageFilter === "all") {
      return t("settings.models.filters.allLanguages");
    }
    return LANGUAGES.find((lang) => lang.value === languageFilter)?.label || "";
  }, [languageFilter, t]);

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
      return "active";
    }
    const model = models.find((m: ModelInfo) => m.id === modelId);
    if (model?.is_downloaded) {
      return "available";
    }
    return "downloadable";
  };

  const getDownloadProgress = (modelId: string): number | undefined => {
    const progress = downloadProgress[modelId];
    return progress?.percentage;
  };

  const getDownloadSpeed = (modelId: string): number | undefined => {
    const stats = downloadStats[modelId];
    return stats?.speed;
  };

  const handleModelSelect = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleModelDownload = async (modelId: string) => {
    await downloadModel(modelId);
  };

  const handleModelDelete = async (modelId: string) => {
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
      } catch (err) {
        console.error(`Failed to delete model ${modelId}:`, err);
      }
    }
  };

  const handleModelCancel = async (modelId: string) => {
    try {
      await cancelDownload(modelId);
    } catch (err) {
      console.error(`Failed to cancel download for ${modelId}:`, err);
    }
  };

  // Filter models based on language filter
  const filteredModels = useMemo(() => {
    return models.filter((model: ModelInfo) => {
      if (languageFilter !== "all") {
        if (!modelSupportsLanguage(model, languageFilter)) return false;
      }
      return true;
    });
  }, [models, languageFilter]);

  // Split filtered models into downloaded (including custom) and available sections
  const { downloadedModels, availableModels } = useMemo(() => {
    const downloaded: ModelInfo[] = [];
    const available: ModelInfo[] = [];

    for (const model of filteredModels) {
      if (
        model.is_custom ||
        model.is_downloaded ||
        model.id in downloadingModels ||
        model.id in extractingModels
      ) {
        downloaded.push(model);
      } else {
        available.push(model);
      }
    }

    // Sort: active model first, then non-custom, then custom at the bottom
    downloaded.sort((a, b) => {
      if (a.id === currentModel) return -1;
      if (b.id === currentModel) return 1;
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return 0;
    });

    return {
      downloadedModels: downloaded,
      availableModels: available,
    };
  }, [filteredModels, downloadingModels, extractingModels, currentModel]);

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

      {activeTab === "processing" && <LanguageModelsSection />}

      {activeTab === "transcription" && filteredModels.length > 0 ? (
        <div className="space-y-6">
          {/* Downloaded Models Section — header always visible so filter stays accessible */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-text/60">
                {t("settings.models.yourModels")}
              </h2>
              {/* Language filter dropdown */}
              <div className="relative" ref={languageDropdownRef}>
                <button
                  type="button"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    languageFilter !== "all"
                      ? "bg-logo-primary/20 text-logo-primary"
                      : "bg-mid-gray/10 text-text/60 hover:bg-mid-gray/20"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">
                    {selectedLanguageLabel}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      languageDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {languageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-background border border-mid-gray/80 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-mid-gray/40">
                      <input
                        ref={languageSearchInputRef}
                        type="text"
                        value={languageSearch}
                        onChange={(e) => setLanguageSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            filteredLanguages.length > 0
                          ) {
                            setLanguageFilter(filteredLanguages[0].value);
                            setLanguageDropdownOpen(false);
                            setLanguageSearch("");
                          } else if (e.key === "Escape") {
                            setLanguageDropdownOpen(false);
                            setLanguageSearch("");
                          }
                        }}
                        placeholder={t(
                          "settings.general.language.searchPlaceholder",
                        )}
                        className="w-full px-2 py-1 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-md focus:outline-none focus:ring-1 focus:ring-logo-primary"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLanguageFilter("all");
                          setLanguageDropdownOpen(false);
                          setLanguageSearch("");
                        }}
                        className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                          languageFilter === "all"
                            ? "bg-logo-primary/20 text-logo-primary font-semibold"
                            : "hover:bg-mid-gray/10"
                        }`}
                      >
                        {t("settings.models.filters.allLanguages")}
                      </button>
                      {filteredLanguages.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => {
                            setLanguageFilter(lang.value);
                            setLanguageDropdownOpen(false);
                            setLanguageSearch("");
                          }}
                          className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                            languageFilter === lang.value
                              ? "bg-logo-primary/20 text-logo-primary font-semibold"
                              : "hover:bg-mid-gray/10"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                      {filteredLanguages.length === 0 && (
                        <div className="px-3 py-2 text-sm text-text/50 text-center">
                          {t("settings.general.language.noResults")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                downloadProgress={getDownloadProgress(model.id)}
                downloadSpeed={getDownloadSpeed(model.id)}
                showRecommended={true}
              />
            ))}
          </div>

          {/* Available Models Section */}
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
                  downloadProgress={getDownloadProgress(model.id)}
                  downloadSpeed={getDownloadSpeed(model.id)}
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
    </div>
  );
};
