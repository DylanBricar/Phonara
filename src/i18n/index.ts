import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { locale } from "@tauri-apps/plugin-os";
import { LANGUAGE_METADATA } from "./languages";
import englishTranslation from "./locales/en/translation.json";
import { commands } from "@/bindings";
import {
  getLanguageDirection,
  updateDocumentDirection,
  updateDocumentLanguage,
} from "@/lib/utils/rtl";

const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  "./locales/*/translation.json",
  "!./locales/en/translation.json",
]);

const languageCodes = [
  "en",
  ...Object.keys(localeLoaders).flatMap((path) => {
    const code = path.match(/\.\/locales\/(.+)\/translation\.json/)?.[1];
    return code ? [code] : [];
  }),
];

const localeBackend: BackendModule = {
  type: "backend",
  init: () => undefined,
  read: (language, _namespace, callback) => {
    const loader = localeLoaders[`./locales/${language}/translation.json`];
    if (!loader) {
      callback(
        new Error(`Unsupported application language: ${language}`),
        false,
      );
      return;
    }

    loader().then(
      (module) => callback(null, module.default),
      (error: unknown) =>
        callback(
          error instanceof Error
            ? error
            : new Error(`Failed to load application language: ${language}`),
          false,
        ),
    );
  },
};

export const SUPPORTED_LANGUAGES = languageCodes
  .map((code) => {
    const meta = LANGUAGE_METADATA[code];
    if (!meta) {
      return { code, name: code, nativeName: code, priority: undefined };
    }
    return {
      code,
      name: meta.name,
      nativeName: meta.nativeName,
      priority: meta.priority,
    };
  })
  .sort((a, b) => {
    if (a.priority !== undefined && b.priority !== undefined) {
      return a.priority - b.priority;
    }
    if (a.priority !== undefined) return -1;
    if (b.priority !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });

export type SupportedLanguageCode = string;

// Check if a language code is supported
export const getSupportedLanguage = (
  langCode: string | null | undefined,
): SupportedLanguageCode | null => {
  if (!langCode) return null;
  const normalized = langCode.toLowerCase().replace(/_/g, "-");
  const subtags = normalized.split("-");
  const language = subtags[0];
  const isHant = subtags.includes("hant");
  const isHans = subtags.includes("hans");
  const isTraditionalRegion = ["tw", "hk", "mo"].some((region) =>
    subtags.includes(region),
  );

  // Try exact match first
  let supported = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === normalized,
  );
  if (!supported) {
    let fallback = language;
    if (language === "zh" && (isHant || (!isHans && isTraditionalRegion))) {
      fallback = "zh-tw";
    } else if (language === "yue") {
      // Cantonese uses Traditional Chinese unless explicitly tagged as Hans.
      fallback = isHans ? "zh" : "zh-tw";
    }
    supported = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code.toLowerCase() === fallback,
    );
  }
  return supported ? supported.code : null;
};

i18n
  .use(localeBackend)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: englishTranslation } },
    partialBundledLanguages: true,
    supportedLngs: languageCodes,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const syncLanguageFromSettings = async () => {
  try {
    const result = await commands.getAppSettings();
    if (result.status === "ok" && result.data.app_language) {
      const supported = getSupportedLanguage(result.data.app_language);
      if (supported && supported !== i18n.language) {
        await i18n.changeLanguage(supported);
      }
    } else {
      const systemLocale = await locale();
      const supported = getSupportedLanguage(systemLocale);
      if (supported && supported !== i18n.language) {
        await i18n.changeLanguage(supported);
      }
    }
  } catch {}
};

syncLanguageFromSettings();

i18n.on("languageChanged", (lng) => {
  const dir = getLanguageDirection(lng);
  updateDocumentDirection(dir);
  updateDocumentLanguage(lng);
});

export { getLanguageDirection, isRTLLanguage } from "@/lib/utils/rtl";

export default i18n;
