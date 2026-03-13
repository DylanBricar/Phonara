import { LANGUAGE_METADATA } from "@/i18n/languages";

export const isRTLLanguage = (langCode: string): boolean => {
  if (!langCode) return false;
  const code = langCode.split("-")[0].toLowerCase();
  return LANGUAGE_METADATA[code]?.direction === "rtl";
};

export const getLanguageDirection = (langCode: string): "ltr" | "rtl" => {
  return isRTLLanguage(langCode) ? "rtl" : "ltr";
};

export const updateDocumentDirection = (dir: "ltr" | "rtl"): void => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", dir);
  }
};

export const updateDocumentLanguage = (lang: string): void => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lang);
  }
};

export const initializeRTL = (langCode: string): void => {
  const dir = getLanguageDirection(langCode);
  updateDocumentDirection(dir);
  updateDocumentLanguage(langCode);
};
