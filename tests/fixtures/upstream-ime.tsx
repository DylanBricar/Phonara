import React from "react";
import { createRoot } from "react-dom/client";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { mockIPC } from "@tauri-apps/api/mocks";
import { CustomWords } from "../../src/components/settings/CustomWords";
import { LanguageSelector } from "../../src/components/settings/LanguageSelector";
import { useSettingsStore } from "../../src/stores/settingsStore";
import { asRuntimeSettings } from "../../src/stores/runtimeSettings";
import english from "../../src/i18n/locales/en/translation.json";

interface ImeFixture {
  writes: { command: string; args: Record<string, unknown> }[];
}

declare global {
  interface Window {
    imeFixture: ImeFixture;
  }
}

const fixture: ImeFixture = { writes: [] };
window.imeFixture = fixture;

// Exercise the actual components, store and generated command bindings. Only
// the native persistence boundary is replaced, as in settingsStoreIntegration.
mockIPC((command, args) => {
  if (
    command === "update_custom_words" ||
    command === "change_selected_language_setting"
  ) {
    fixture.writes.push({ command, args: args as Record<string, unknown> });
    return null;
  }
  throw new Error(`Unexpected native command in IME fixture: ${command}`);
});
useSettingsStore.setState({
  settings: asRuntimeSettings({ custom_words: [], selected_language: "auto" }),
  initialized: true,
  isLoading: false,
});

const i18n = createInstance();
await i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: english } },
  interpolation: { escapeValue: false },
});

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <CustomWords descriptionMode="inline" />
    <LanguageSelector descriptionMode="inline" />
  </I18nextProvider>,
);
