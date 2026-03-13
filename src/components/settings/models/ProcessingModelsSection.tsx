import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCcw, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui";

export const ProcessingModelsSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    getSetting,
    settings,
    refreshSettings,
    fetchPostProcessModels,
    updatePostProcessApiKey,
    postProcessModelOptions,
  } = useSettings();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const savedModels = getSetting("saved_processing_models") || [];
  const providers = settings?.post_process_providers || [];

  const providerOptions = useMemo(
    () => providers.map((p) => ({ value: p.id, label: p.label })),
    [providers],
  );

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const providerRequiresApiKey = selectedProvider?.requires_api_key !== false;
  const availableModels = postProcessModelOptions[selectedProviderId] || [];
  const modelOptions = useMemo(
    () => availableModels.map((m) => ({ value: m, label: m })),
    [availableModels],
  );

  const handleProviderChange = useCallback(
    (providerId: string) => {
      setSelectedProviderId(providerId);
      setSelectedModel("");
      const existingKey = settings?.post_process_api_keys?.[providerId] ?? "";
      setApiKey(existingKey);
    },
    [settings],
  );

  const handleFetchModels = useCallback(async () => {
    if (!selectedProviderId) return;
    if (apiKey.trim()) {
      await updatePostProcessApiKey(selectedProviderId, apiKey.trim());
    }
    setIsFetching(true);
    try {
      await fetchPostProcessModels(selectedProviderId);
    } finally {
      setIsFetching(false);
    }
  }, [
    selectedProviderId,
    apiKey,
    fetchPostProcessModels,
    updatePostProcessApiKey,
  ]);

  const handleSave = useCallback(async () => {
    if (!selectedProviderId || !selectedModel) return;
    const provider = providers.find((p) => p.id === selectedProviderId);
    const label = `${provider?.label || selectedProviderId} / ${selectedModel}`;
    try {
      await commands.addSavedProcessingModel(
        selectedProviderId,
        selectedModel,
        label,
      );
      await refreshSettings();
      setIsAdding(false);
      setSelectedProviderId("");
      setSelectedModel("");
      setApiKey("");
    } catch {
    }
  }, [selectedProviderId, selectedModel, providers, refreshSettings]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await commands.deleteSavedProcessingModel(id);
        await refreshSettings();
      } catch {
        }
    },
    [refreshSettings],
  );

  const handleStartAdd = useCallback(() => {
    setIsAdding(true);
    setSelectedProviderId("");
    setSelectedModel("");
    setApiKey("");
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-text/60">
        {t("settings.models.processingModels.description")}
      </p>

      {savedModels.length > 0 && (
        <div className="space-y-1">
          {savedModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-mid-gray/5 border border-mid-gray/10"
            >
              <span className="text-sm text-text">{model.label}</span>
              <button
                onClick={() => handleDelete(model.id)}
                className="p-1 text-mid-gray/40 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {savedModels.length === 0 && !isAdding && (
        <div className="p-3 bg-mid-gray/5 rounded-md border border-mid-gray/10">
          <p className="text-sm text-mid-gray">
            {t("settings.models.processingModels.noModels")}
          </p>
        </div>
      )}

      {isAdding && (
        <div className="space-y-3 p-3 rounded-lg border border-mid-gray/20 bg-mid-gray/5">
          <div className="space-y-1">
            <label className="text-sm font-semibold">
              {t("settings.models.processingModels.provider")}
            </label>
            <Dropdown
              selectedValue={selectedProviderId || null}
              options={providerOptions}
              onSelect={handleProviderChange}
              placeholder={t("settings.models.processingModels.provider")}
            />
          </div>

          {selectedProviderId && (
            <>
              {providerRequiresApiKey && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold">
                    {t("settings.models.processingModels.apiKey")}
                  </label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t(
                      "settings.models.processingModels.apiKeyPlaceholder",
                    )}
                    variant="compact"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-semibold">
                  {t("settings.models.processingModels.model")}
                </label>
                <div className="flex items-center gap-2">
                  {modelOptions.length > 0 ? (
                    <Dropdown
                      selectedValue={selectedModel || null}
                      options={modelOptions}
                      onSelect={setSelectedModel}
                      placeholder={t(
                        "settings.models.processingModels.modelPlaceholder",
                      )}
                      className="flex-1"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder={t(
                        "settings.models.processingModels.modelPlaceholder",
                      )}
                      variant="compact"
                      className="flex-1"
                    />
                  )}
                  <button
                    onClick={handleFetchModels}
                    disabled={isFetching || (providerRequiresApiKey && !apiKey.trim())}
                    className="flex items-center justify-center h-8 w-8 rounded-md bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:opacity-40"
                    title={t("settings.models.processingModels.fetchModels")}
                  >
                    <RefreshCcw
                      className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              variant="primary"
              size="md"
              disabled={!selectedProviderId || !selectedModel.trim()}
            >
              {t("settings.models.processingModels.save")}
            </Button>
            <Button
              onClick={() => setIsAdding(false)}
              variant="secondary"
              size="md"
            >
              {t("settings.models.processingModels.cancel")}
            </Button>
          </div>
        </div>
      )}

      {!isAdding && (
        <Button onClick={handleStartAdd} variant="primary" size="md">
          {t("settings.models.processingModels.addModel")}
        </Button>
      )}
    </div>
  );
};
