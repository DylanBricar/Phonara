import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { commands, type PostProcessAction } from "@/bindings";
import { useSettings } from "@/hooks/useSettings";
import {
  ACTION_ICON_NAMES,
  DEFAULT_ACTION_ICON,
  getActionIcon,
} from "@/lib/constants/actionIcons";
import {
  Dropdown,
  SettingsGroup,
  Textarea,
  ToggleSwitch,
} from "@/components/ui";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { ShortcutInput } from "../ShortcutInput";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-10 gap-1.5">
    {ACTION_ICON_NAMES.map((name) => {
      const Icon = getActionIcon(name);
      const isActive = name === value;
      return (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={`flex items-center justify-center aspect-square rounded-md border transition-colors ${
            isActive
              ? "border-logo-primary bg-logo-primary/20 text-logo-primary"
              : "border-mid-gray/30 hover:border-logo-primary/60 text-text/70"
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      );
    })}
  </div>
);

interface ActionEditorProps {
  action: PostProcessAction | null; // null = creating
  onClose: () => void;
  onSaved: (id: string) => void;
}

const ActionEditor: React.FC<ActionEditorProps> = ({
  action,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { settings, refreshSettings } = useSettings();

  const savedModels = settings?.llm_models || [];
  const actions = settings?.post_process_actions || [];

  const [name, setName] = useState(action?.name ?? "");
  const [prompt, setPrompt] = useState(action?.prompt ?? "");
  const [icon, setIcon] = useState(action?.icon ?? DEFAULT_ACTION_ICON);
  const [llmModelId, setLlmModelId] = useState<string | null>(
    action?.llm_model_id ?? savedModels[0]?.id ?? null,
  );
  const [triggerKey, setTriggerKey] = useState<number | null>(
    action?.trigger_key ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const modelOptions = useMemo(
    () =>
      savedModels.map((m) => ({
        value: m.id,
        label: m.label,
      })),
    [savedModels],
  );

  const triggerKeyOptions = useMemo(() => {
    const usedKeys = new Set(
      actions
        .filter((a) => a.id !== action?.id)
        .map((a) => a.trigger_key)
        .filter((k): k is number => k != null),
    );
    const options = [
      { value: "none", label: t("settings.postProcessing.actions.noKey") },
    ];
    for (let k = 1; k <= 9; k++) {
      options.push({
        value: String(k),
        label: usedKeys.has(k)
          ? t("settings.postProcessing.actions.keyTaken", { key: k })
          : String(k),
        disabled: usedKeys.has(k),
      } as { value: string; label: string; disabled?: boolean });
    }
    return options;
  }, [actions, action?.id, t]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedName || !trimmedPrompt) return;

    setIsSaving(true);
    setError(null);
    try {
      if (action) {
        const result = await commands.updatePostProcessAction(
          action.id,
          trimmedName,
          trimmedPrompt,
          llmModelId,
          icon,
          triggerKey,
        );
        if (result.status === "ok") {
          await refreshSettings();
          onSaved(action.id);
        } else {
          setError(String(result.error));
        }
      } else {
        const result = await commands.addPostProcessAction(
          trimmedName,
          trimmedPrompt,
          llmModelId,
          icon,
          triggerKey,
        );
        if (result.status === "ok") {
          await refreshSettings();
          onSaved(result.data.id);
        } else {
          setError(String(result.error));
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    action,
    name,
    prompt,
    llmModelId,
    icon,
    triggerKey,
    refreshSettings,
    onSaved,
  ]);

  const handleDelete = useCallback(async () => {
    if (!action) return;
    const result = await commands.deletePostProcessAction(action.id);
    if (result.status === "ok") {
      await refreshSettings();
      onClose();
    }
  }, [action, refreshSettings, onClose]);

  return (
    <div className="space-y-4 p-4 rounded-lg border border-logo-primary/40 bg-mid-gray/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {action
            ? t("settings.postProcessing.actions.editTitle")
            : t("settings.postProcessing.actions.newTitle")}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-text/50 hover:text-text"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">
          {t("settings.postProcessing.actions.name")}
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.postProcessing.actions.namePlaceholder")}
          variant="compact"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">
          {t("settings.postProcessing.actions.icon")}
        </label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">
          {t("settings.postProcessing.actions.prompt")}
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("settings.postProcessing.actions.promptPlaceholder")}
        />
        <p className="text-xs text-text/50">
          {t("settings.postProcessing.actions.promptHint")}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">
          {t("settings.postProcessing.actions.model")}
        </label>
        {modelOptions.length > 0 ? (
          <Dropdown
            selectedValue={llmModelId}
            options={modelOptions}
            onSelect={(value) => setLlmModelId(value)}
            placeholder={t("settings.postProcessing.actions.modelPlaceholder")}
          />
        ) : (
          <p className="text-xs text-amber-500">
            {t("settings.postProcessing.actions.noModels")}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">
          {t("settings.postProcessing.actions.triggerKey")}
        </label>
        <Dropdown
          selectedValue={triggerKey != null ? String(triggerKey) : "none"}
          options={triggerKeyOptions}
          onSelect={(value) =>
            setTriggerKey(value === "none" ? null : Number(value))
          }
          placeholder={t("settings.postProcessing.actions.noKey")}
        />
        <p className="text-xs text-text/50">
          {t("settings.postProcessing.actions.triggerKeyHint")}
        </p>
      </div>

      {action ? (
        <div className="space-y-1">
          <ShortcutInput
            shortcutId={`ppa_${action.id}`}
            grouped={false}
            descriptionMode="inline"
          />
        </div>
      ) : (
        <p className="text-xs text-text/50">
          {t("settings.postProcessing.actions.shortcutAfterSave")}
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          variant="primary"
          size="md"
          disabled={!name.trim() || !prompt.trim() || isSaving}
        >
          {action ? t("common.save") : t("common.create")}
        </Button>
        <Button onClick={onClose} variant="secondary" size="md">
          {t("common.cancel")}
        </Button>
        {action && (
          <Button onClick={handleDelete} variant="secondary" size="md">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const PostProcessingSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSetting, isUpdating } = useSettings();

  const actions = settings?.post_process_actions || [];
  const models = settings?.llm_models || [];
  const defaultShortcutEnabled = settings?.post_process_enabled ?? false;

  // editingId: null = list view, "new" = creating, else action id being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingAction =
    editingId && editingId !== "new"
      ? (actions.find((a) => a.id === editingId) ?? null)
      : null;

  // Close the editor if the action being edited disappears.
  useEffect(() => {
    if (editingId && editingId !== "new" && !editingAction) {
      setEditingId(null);
    }
  }, [editingId, editingAction]);

  const modelLabel = (id: string | null | undefined) =>
    models.find((m) => m.id === id)?.label;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.postProcessing.title")}>
        <p className="px-1 text-sm text-text/60">
          {t("settings.postProcessing.description")}
        </p>

        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = getActionIcon(action.icon);
            const label = modelLabel(action.llm_model_id);
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-mid-gray/20 bg-mid-gray/5"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-logo-primary/15 text-logo-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {action.name}
                  </p>
                  <p className="text-xs text-text/50 truncate">
                    {label ?? t("settings.postProcessing.actions.noModelShort")}
                    {action.trigger_key != null &&
                      ` · ${t("settings.postProcessing.actions.keyLabel", {
                        key: action.trigger_key,
                      })}`}
                  </p>
                </div>
                <button
                  onClick={() => setEditingId(action.id)}
                  className="p-1.5 rounded-md text-text/50 hover:text-logo-primary transition-colors shrink-0"
                  title={t("common.edit")}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {actions.length === 0 && !editingId && (
            <p className="text-sm text-text/50 py-2">
              {t("settings.postProcessing.actions.empty")}
            </p>
          )}
        </div>

        {editingId ? (
          <ActionEditor
            action={editingAction}
            onClose={() => setEditingId(null)}
            onSaved={(id) => setEditingId(id)}
          />
        ) : (
          <Button
            onClick={() => setEditingId("new")}
            variant="secondary"
            size="md"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("settings.postProcessing.actions.newAction")}
          </Button>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("settings.postProcessing.defaultShortcut.title")}>
        <ToggleSwitch
          checked={defaultShortcutEnabled}
          onChange={(checked) => updateSetting("post_process_enabled", checked)}
          isUpdating={isUpdating("post_process_enabled")}
          label={t("settings.postProcessing.defaultShortcut.toggleLabel")}
          description={t("settings.postProcessing.defaultShortcut.toggleDescription")}
          grouped={true}
        />
        {defaultShortcutEnabled && (
          <ShortcutInput
            shortcutId="transcribe_with_post_process"
            grouped={true}
          />
        )}
      </SettingsGroup>
    </div>
  );
};
