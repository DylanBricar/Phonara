import type { TFunction } from "i18next";
import type { ModelInfo } from "@/bindings";

export function getTranslatedModelName(model: ModelInfo, t: TFunction): string {
  const translationKey = `onboarding.models.${model.id}.name`;
  const translated = t(translationKey, { defaultValue: "" });
  return translated !== "" ? translated : model.name;
}

export function getTranslatedModelDescription(
  model: ModelInfo,
  t: TFunction,
): string {
  if (model.is_custom) {
    return t("onboarding.customModelDescription");
  }
  const translationKey = `onboarding.models.${model.id}.description`;
  const translated = t(translationKey, { defaultValue: "" });
  return translated !== "" ? translated : model.description;
}
