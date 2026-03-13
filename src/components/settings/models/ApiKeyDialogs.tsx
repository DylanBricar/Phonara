import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui";

const GEMINI_MODEL_OPTIONS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
];

const OPENAI_MODEL_OPTIONS = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
];

interface ApiKeyDialogProps {
  keyInput: string;
  modelInput: string;
  onKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const GeminiKeyDialog: React.FC<ApiKeyDialogProps> = ({
  keyInput,
  modelInput,
  onKeyChange,
  onModelChange,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-background border border-mid-gray/40 rounded-xl p-5 w-96 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold">
            {t("settings.gemini.apiKeyRequired")}
          </h3>
          <p className="text-sm text-text/60 mt-1">
            {t("settings.gemini.apiKeyRequiredDescription")}
          </p>
        </div>
        <Input
          autoFocus
          type="password"
          value={keyInput}
          onChange={(e) => onKeyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          placeholder={t("settings.gemini.apiKeyPlaceholder")}
          className="w-full"
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-text/70">
            {t("settings.gemini.selectModel")}
          </label>
          <Dropdown
            selectedValue={modelInput}
            options={GEMINI_MODEL_OPTIONS.map((m) => ({
              value: m,
              label: t(`settings.gemini.models.${m}`, m),
            }))}
            onSelect={onModelChange}
            placeholder={t("settings.gemini.selectModel")}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("settings.gemini.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!keyInput.trim()}
          >
            {t("settings.gemini.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const OpenaiKeyDialog: React.FC<ApiKeyDialogProps> = ({
  keyInput,
  modelInput,
  onKeyChange,
  onModelChange,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-background border border-mid-gray/40 rounded-xl p-5 w-96 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold">
            {t("settings.openai.apiKeyRequired")}
          </h3>
          <p className="text-sm text-text/60 mt-1">
            {t("settings.openai.apiKeyRequiredDescription")}
          </p>
        </div>
        <Input
          autoFocus
          type="password"
          value={keyInput}
          onChange={(e) => onKeyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          placeholder={t("settings.openai.apiKeyPlaceholder")}
          className="w-full"
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-text/70">
            {t("settings.openai.selectModel")}
          </label>
          <Dropdown
            selectedValue={modelInput}
            options={OPENAI_MODEL_OPTIONS.map((m) => ({
              value: m,
              label: t(`settings.openai.models.${m}`, m),
            }))}
            onSelect={onModelChange}
            placeholder={t("settings.openai.selectModel")}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("settings.openai.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!keyInput.trim()}
          >
            {t("settings.openai.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};
