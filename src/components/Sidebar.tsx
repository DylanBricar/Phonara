import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Cog,
  FlaskConical,
  History,
  Info,
  Sparkles,
  Cpu,
  Palette,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import PhonaraTextLogo from "./icons/PhonaraTextLogo";
import HandyHand from "./icons/HandyHand";
import { useSettingsStore } from "../stores/settingsStore";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
  AppearanceSettings,
} from "./settings";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<LucideProps>;
  component: React.ComponentType;
  debugOnly?: boolean;
  enabled?: (settings: import("../bindings").AppSettings | null) => boolean;
}

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: HandyHand,
    component: GeneralSettings,
  },
  models: {
    labelKey: "sidebar.models",
    icon: Cpu,
    component: ModelsSettings,
  },
  appearance: {
    labelKey: "sidebar.appearance",
    icon: Palette,
    component: AppearanceSettings,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Cog,
    component: AdvancedSettings,
  },
  history: {
    labelKey: "sidebar.history",
    icon: History,
    component: HistorySettings,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    debugOnly: true,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const debugMode = useSettingsStore(
    (state) => state.settings?.debug_mode ?? false,
  );

  const availableSections = useMemo(
    () =>
      Object.entries(SECTIONS_CONFIG)
        .filter(
          ([, config]) =>
            !("debugOnly" in config && config.debugOnly) || debugMode,
        )
        .map(([id, config]) => ({ id: id as SidebarSection, ...config })),
    [debugMode],
  );

  return (
    <nav className="flex flex-col w-48 h-full border-e border-mid-gray/20 items-center px-2">
      <PhonaraTextLogo width={120} className="m-4 flex justify-center" />
      <div
        className="flex flex-col w-full items-center gap-1 pt-2 border-t border-mid-gray/20"
        role="tablist"
      >
        {availableSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              role="tab"
              aria-selected={isActive}
              className={`flex gap-2 items-center p-2 w-full rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? "bg-logo-primary/80"
                  : "hover:bg-mid-gray/20 hover:opacity-100 opacity-85"
              }`}
              onClick={() => onSectionChange(section.id)}
            >
              <Icon width={24} height={24} className="shrink-0" />
              <span
                className="text-sm font-medium truncate"
                title={t(section.labelKey)}
              >
                {t(section.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
