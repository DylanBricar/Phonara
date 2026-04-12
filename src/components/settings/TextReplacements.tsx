import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "../../hooks/useSettings";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { SettingContainer } from "../ui/SettingContainer";
import type { TextReplacement } from "@/bindings";

interface TextReplacementsProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const TextReplacements: React.FC<TextReplacementsProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");
    const [caseSensitive, setCaseSensitive] = useState(false);
    const textReplacements: TextReplacement[] =
      getSetting("text_replacements") || [];

    const handleAddRule = () => {
      const trimmedFind = findText.trim();
      if (!trimmedFind) {
        toast.error(t("settings.advanced.textReplacements.emptyFind"));
        return;
      }

      const duplicate = textReplacements.some(
        (r) => r.find.toLowerCase() === trimmedFind.toLowerCase(),
      );
      if (duplicate) {
        toast.error(t("settings.advanced.textReplacements.duplicate"));
        return;
      }

      const newRule: TextReplacement = {
        find: trimmedFind,
        replace: replaceText,
        case_sensitive: caseSensitive,
      };

      updateSetting("text_replacements", [...textReplacements, newRule]);
      setFindText("");
      setReplaceText("");
      setCaseSensitive(false);
    };

    const handleRemoveRule = (index: number) => {
      const updated = textReplacements.filter((_, i) => i !== index);
      updateSetting("text_replacements", updated);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddRule();
      }
    };

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.textReplacements.title")}
          description={t("settings.advanced.textReplacements.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="text"
              className="max-w-32"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t(
                "settings.advanced.textReplacements.findPlaceholder",
              )}
              variant="compact"
              disabled={isUpdating("text_replacements")}
            />
            <span className="text-sm text-mid-gray">→</span>
            <Input
              type="text"
              className="max-w-32"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t(
                "settings.advanced.textReplacements.replacePlaceholder",
              )}
              variant="compact"
              disabled={isUpdating("text_replacements")}
            />
            <label className="flex items-center gap-1 text-xs text-mid-gray cursor-pointer select-none">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                disabled={isUpdating("text_replacements")}
                className="rounded"
              />
              {t("settings.advanced.textReplacements.caseSensitive")}
            </label>
            <Button
              onClick={handleAddRule}
              disabled={
                !findText.trim() || isUpdating("text_replacements")
              }
              variant="primary"
              size="md"
            >
              {t("settings.advanced.textReplacements.add")}
            </Button>
          </div>
        </SettingContainer>
        {textReplacements.length > 0 && (
          <div
            className={`px-4 p-2 ${grouped ? "" : "rounded-lg border border-mid-gray/20"} flex flex-col gap-1`}
          >
            {textReplacements.map((rule, index) => (
              <div
                key={`${rule.find}-${index}`}
                className="flex items-center gap-2"
              >
                <Button
                  onClick={() => handleRemoveRule(index)}
                  disabled={isUpdating("text_replacements")}
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center gap-1 cursor-pointer"
                  aria-label={t(
                    "settings.advanced.textReplacements.remove",
                  )}
                >
                  <span className="font-mono text-xs">{rule.find}</span>
                  <span className="text-mid-gray">→</span>
                  <span className="font-mono text-xs">
                    {rule.replace || (
                      <span className="italic text-mid-gray/60">
                        {t("settings.advanced.textReplacements.emptyReplace")}
                      </span>
                    )}
                  </span>
                  {rule.case_sensitive && (
                    /* eslint-disable i18next/no-literal-string */
                    <span className="text-[10px] text-mid-gray/80 ml-1">
                      Aa
                    </span>
                    /* eslint-enable i18next/no-literal-string */
                  )}
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  },
);
