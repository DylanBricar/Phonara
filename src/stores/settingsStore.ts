import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";
import type {
  AudioDevice,
  TranscribeAcceleratorSetting,
  OrtAcceleratorSetting,
} from "@/bindings";
import { commands } from "@/bindings";
import { settingUpdaters } from "./settingUpdaters";
import type { Settings, SettingsStore } from "./settingsStoreTypes";
import { asRuntimeSettings } from "./runtimeSettings";
import { updateTranscribeAccelerationAtomically } from "./transcribeAccelerationUpdate";
import { updateSettingOptimistically } from "./settingPersistence";
import { isMicrophonePriority } from "../lib/microphonePreferences";
import {
  modelListConnection,
  PostProcessModelRequests,
  sameModelListConnection,
} from "./postProcessModelRequests";

const modelListRequests = new PostProcessModelRequests();
let settingsRefreshSequence = 0;
let latestSettingsRefresh: Promise<void> | null = null;

const DEFAULT_AUDIO_DEVICE: AudioDevice = {
  index: "default",
  name: "Default",
  is_default: true,
};

// Synchronous re-entrancy guard for initialize(). The store's `initialized` flag
// is only set after several awaits, so dozens of components calling initialize()
// on first paint would otherwise all pass the guard and each register a duplicate
// "model-state-changed" listener. Holding the in-flight promise makes it run once.
let initInFlight: Promise<void> | null = null;

export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector((set, get) => ({
    settings: null,
    defaultSettings: null,
    isLoading: true,
    isUpdating: {},
    audioDevices: [],
    outputDevices: [],
    customSounds: { start: false, stop: false },
    postProcessModelOptions: {},
    initialized: false,
    _unlisten: null,
    updateChecksLocked: null,

    setSettings: (settings) => {
      const state = get();
      const providerIds = new Set([
        ...Object.keys(state.postProcessModelOptions),
        ...(state.settings?.post_process_providers ?? []).map((p) => p.id),
        ...(settings?.post_process_providers ?? []).map((p) => p.id),
      ]);
      const postProcessModelOptions = { ...state.postProcessModelOptions };
      const isUpdating = { ...state.isUpdating };
      for (const providerId of providerIds) {
        if (
          !sameModelListConnection(
            modelListConnection(state.settings, providerId),
            modelListConnection(settings, providerId),
          )
        ) {
          modelListRequests.invalidate(providerId);
          postProcessModelOptions[providerId] = [];
          isUpdating[`post_process_models_fetch:${providerId}`] =
            modelListRequests.hasCurrent(providerId);
        }
      }
      set({ settings, postProcessModelOptions, isUpdating });
    },
    setDefaultSettings: (defaultSettings) => set({ defaultSettings }),
    setLoading: (isLoading) => set({ isLoading }),
    setUpdating: (key, updating) =>
      set((state) => ({
        isUpdating: { ...state.isUpdating, [key]: updating },
      })),
    setAudioDevices: (audioDevices) => set({ audioDevices }),
    setOutputDevices: (outputDevices) => set({ outputDevices }),
    setCustomSounds: (customSounds) => set({ customSounds }),

    getSetting: (key) => get().settings?.[key],
    isUpdatingKey: (key) => get().isUpdating[key] || false,

    refreshSettings: () => {
      const request = ++settingsRefreshSequence;
      const microphonePriorityBeforeRefresh =
        get().settings?.microphone_priority;
      const refresh = async () => {
        try {
          const result = await commands.getAppSettings();
          if (request !== settingsRefreshSequence) {
            // A caller waiting for its save's read-back must also wait for a
            // newer refresh that superseded it before releasing queued reads.
            await latestSettingsRefresh;
            return;
          }
          if (result.status === "ok") {
            const settings = result.data;
            const normalizedSettings = asRuntimeSettings({
              ...settings,
              always_on_microphone: settings.always_on_microphone ?? false,
              selected_microphone: settings.selected_microphone ?? "Default",
              microphone_priority: settings.microphone_priority ?? [],
              clamshell_microphone: settings.clamshell_microphone ?? "Default",
              selected_output_device:
                settings.selected_output_device ?? "Default",
            });
            const currentSettings = get().settings;
            get().setSettings(
              currentSettings &&
                currentSettings.microphone_priority !==
                  microphonePriorityBeforeRefresh
                ? {
                    ...normalizedSettings,
                    // A save or backend event confirmed a new order while this
                    // older snapshot was in flight. Preserve that newer order.
                    microphone_priority: currentSettings.microphone_priority,
                  }
                : normalizedSettings,
            );
            set({ isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          if (request === settingsRefreshSequence) set({ isLoading: false });
          else await latestSettingsRefresh;
        }
      };
      latestSettingsRefresh = refresh();
      return latestSettingsRefresh;
    },

    refreshAudioDevices: async () => {
      try {
        const result = await commands.getAvailableMicrophones();
        if (result.status === "ok") {
          const devicesWithDefault = [
            DEFAULT_AUDIO_DEVICE,
            ...result.data.filter(
              (d) => d.name !== "Default" && d.name !== "default",
            ),
          ];
          set({ audioDevices: devicesWithDefault });
        } else {
          set({ audioDevices: [DEFAULT_AUDIO_DEVICE] });
        }
      } catch {
        set({ audioDevices: [DEFAULT_AUDIO_DEVICE] });
      }
    },

    refreshOutputDevices: async () => {
      try {
        const result = await commands.getAvailableOutputDevices();
        if (result.status === "ok") {
          const devicesWithDefault = [
            DEFAULT_AUDIO_DEVICE,
            ...result.data.filter(
              (d) => d.name !== "Default" && d.name !== "default",
            ),
          ];
          set({ outputDevices: devicesWithDefault });
        } else {
          set({ outputDevices: [DEFAULT_AUDIO_DEVICE] });
        }
      } catch {
        set({ outputDevices: [DEFAULT_AUDIO_DEVICE] });
      }
    },

    playTestSound: async (soundType: "start" | "stop") => {
      try {
        await commands.playTestSound(soundType);
      } catch {}
    },

    checkCustomSounds: async () => {
      try {
        const sounds = await commands.checkCustomSounds();
        get().setCustomSounds(sounds);
      } catch {}
    },

    updateSetting: async <K extends keyof Settings>(
      key: K,
      value: Settings[K],
    ) => {
      const { settings, setUpdating, isUpdatingKey } = get();
      await updateSettingOptimistically({
        settings,
        key,
        value,
        updateSettings: (updater) =>
          set((state) => ({ settings: updater(state.settings) })),
        setUpdating,
        isUpdating: isUpdatingKey,
        persist: async (nextValue) => settingUpdaters[key]?.(nextValue),
      });
    },

    updateTranscribeAcceleration: async (accelerator, gpuDevice) => {
      const { settings, setUpdating, isUpdatingKey } = get();
      return updateTranscribeAccelerationAtomically({
        settings,
        accelerator,
        gpuDevice,
        updateSettings: (updater) =>
          set((state) => ({ settings: updater(state.settings) })),
        setUpdating,
        isUpdating: isUpdatingKey,
        persist: async (nextAccelerator, nextGpuDevice) =>
          commands.changeTranscribeAccelerationSetting(
            nextAccelerator,
            nextGpuDevice,
          ),
      });
    },

    resetSetting: async (key) => {
      const { defaultSettings } = get();
      if (defaultSettings) {
        const defaultValue = defaultSettings[key];
        if (defaultValue !== undefined) {
          await get().updateSetting(key, defaultValue as Settings[typeof key]);
        }
      }
    },

    updateBinding: async (id, binding) => {
      const { settings, setUpdating } = get();
      const updateKey = `binding_${id}`;
      const originalBinding = settings?.bindings?.[id]?.current_binding;

      setUpdating(updateKey, true);

      try {
        set((state) => ({
          settings: state.settings
            ? {
                ...state.settings,
                bindings: {
                  ...state.settings.bindings,
                  [id]: {
                    ...state.settings.bindings?.[id]!,
                    current_binding: binding,
                  },
                },
              }
            : null,
        }));

        const result = await commands.changeBinding(id, binding);

        if (result.status === "error") {
          throw new Error(result.error);
        }

        if (!result.data.success) {
          throw new Error(result.data.error || "Failed to update binding");
        }
      } catch (error) {
        if (originalBinding && get().settings) {
          set((state) => ({
            settings: state.settings
              ? {
                  ...state.settings,
                  bindings: {
                    ...state.settings.bindings,
                    [id]: {
                      ...state.settings.bindings?.[id]!,
                      current_binding: originalBinding,
                    },
                  },
                }
              : null,
          }));
        }

        throw error;
      } finally {
        setUpdating(updateKey, false);
      }
    },

    resetBinding: async (id) => {
      const { setUpdating, refreshSettings } = get();
      const updateKey = `binding_${id}`;

      setUpdating(updateKey, true);

      try {
        await commands.resetBinding(id);
        await refreshSettings();
      } catch (error) {
        console.error(`Failed to reset binding "${id}":`, error);
      } finally {
        setUpdating(updateKey, false);
      }
    },

    setPostProcessProvider: async (providerId) => {
      const {
        settings,
        setUpdating,
        refreshSettings,
        setPostProcessModelOptions,
      } = get();
      const updateKey = "post_process_provider_id";
      const previousId = settings?.post_process_provider_id ?? null;
      const previousOptions = get().postProcessModelOptions[providerId];

      setUpdating(updateKey, true);

      if (settings) {
        set((state) => ({
          settings: state.settings
            ? { ...state.settings, post_process_provider_id: providerId }
            : null,
        }));
      }

      setPostProcessModelOptions(providerId, []);

      try {
        const result = await commands.setPostProcessProvider(providerId);
        if (result.status === "error") throw new Error(result.error);
        await refreshSettings();
      } catch (error) {
        if (previousId !== null) {
          set((state) => ({
            settings: state.settings
              ? { ...state.settings, post_process_provider_id: previousId }
              : null,
          }));
        }
        // Restore the cleared model list too, otherwise the dropdown for this
        // provider is left empty even though the active provider reverted.
        if (previousOptions !== undefined) {
          setPostProcessModelOptions(providerId, previousOptions);
        }
        console.error("Failed to switch post-process provider:", error);
      } finally {
        setUpdating(updateKey, false);
      }
    },

    updatePostProcessSetting: async (
      settingType: "base_url" | "api_key" | "model",
      providerId: string,
      value: string,
    ) => {
      const { setUpdating, refreshSettings } = get();
      const updateKey = `post_process_${settingType}:${providerId}`;
      const endEdit =
        settingType !== "model"
          ? modelListRequests.beginEdit(providerId)
          : undefined;
      if (endEdit) get().setPostProcessModelOptions(providerId, []);

      setUpdating(updateKey, true);

      try {
        const result =
          settingType === "base_url"
            ? await commands.changePostProcessBaseUrlSetting(providerId, value)
            : settingType === "api_key"
              ? await commands.changePostProcessApiKeySetting(providerId, value)
              : await commands.changePostProcessModelSetting(providerId, value);
        if (result.status === "error") throw new Error(result.error);
      } catch (error) {
        console.error(`Failed to update post-process ${settingType}:`, error);
      } finally {
        // Re-sync the UI to backend truth even on failure, otherwise the
        // component keeps showing the user-typed (unpersisted) value.
        await refreshSettings();
        endEdit?.();
        setUpdating(updateKey, false);
      }
    },

    updatePostProcessBaseUrl: async (providerId, baseUrl) => {
      const { setUpdating, refreshSettings } = get();
      const updateKey = `post_process_base_url:${providerId}`;
      const endEdit = modelListRequests.beginEdit(providerId);
      get().setPostProcessModelOptions(providerId, []);

      setUpdating(updateKey, true);

      try {
        const urlResult = await commands.changePostProcessBaseUrlSetting(
          providerId,
          baseUrl,
        );
        if (urlResult.status === "error") return;

        const modelResult = await commands.changePostProcessModelSetting(
          providerId,
          "",
        );
        if (modelResult.status === "error") return;
      } catch (error) {
        console.error("Failed to update post-process base URL:", error);
      } finally {
        // The URL can be saved even if clearing the selected model fails.
        // Synchronize the effective connection before releasing queued reads.
        await refreshSettings();
        endEdit();
        setUpdating(updateKey, false);
      }
    },

    updatePostProcessApiKey: async (providerId, apiKey) => {
      return get().updatePostProcessSetting("api_key", providerId, apiKey);
    },

    updatePostProcessModel: async (providerId, model) => {
      return get().updatePostProcessSetting("model", providerId, model);
    },

    fetchPostProcessModels: async (providerId) => {
      const updateKey = `post_process_models_fetch:${providerId}`;
      const { setUpdating } = get();
      const request = modelListRequests.start(providerId);
      let connection: ReturnType<typeof modelListConnection>;
      const isCurrent = () =>
        modelListRequests.isCurrent(providerId, request) &&
        sameModelListConnection(
          connection,
          modelListConnection(get().settings, providerId),
        );

      setUpdating(updateKey, true);

      try {
        let pendingEdit;
        while ((pendingEdit = modelListRequests.pendingEdit(providerId))) {
          await pendingEdit;
          if (!modelListRequests.isCurrent(providerId, request)) return [];
        }
        if (!modelListRequests.isCurrent(providerId, request)) return [];
        connection = modelListConnection(get().settings, providerId);
        if (!connection) return [];
        modelListRequests.markStarted(providerId, request);
        const result = await commands.fetchPostProcessModels(providerId);
        if (!isCurrent()) return [];
        if (result.status === "ok") {
          set((state) => ({
            postProcessModelOptions: {
              ...state.postProcessModelOptions,
              [providerId]: result.data,
            },
          }));
          return result.data;
        }
        return [];
      } catch {
        return [];
      } finally {
        if (modelListRequests.finish(providerId, request)) {
          setUpdating(updateKey, false);
        }
      }
    },

    setPostProcessModelOptions: (providerId, models) => {
      modelListRequests.invalidate(providerId);
      set((state) => ({
        postProcessModelOptions: {
          ...state.postProcessModelOptions,
          [providerId]: models,
        },
        isUpdating: {
          ...state.isUpdating,
          [`post_process_models_fetch:${providerId}`]:
            modelListRequests.hasCurrent(providerId),
        },
      }));
    },

    loadDefaultSettings: async () => {
      try {
        const result = await commands.getDefaultSettings();
        if (result.status === "ok") {
          set({ defaultSettings: asRuntimeSettings(result.data) });
        }
      } catch {}
    },

    loadUpdateChecksLocked: async () => {
      try {
        set({ updateChecksLocked: await commands.isUpdateChecksLocked() });
      } catch (error) {
        console.error("Failed to check update checks lock state:", error);
        set({ updateChecksLocked: false });
      }
    },

    initialize: async () => {
      if (get().initialized) return;
      // Set the in-flight promise synchronously (before any await) so concurrent
      // callers on first paint share one run instead of each re-initializing.
      if (initInFlight) return initInFlight;

      initInFlight = (async () => {
        const {
          refreshSettings,
          checkCustomSounds,
          loadDefaultSettings,
          loadUpdateChecksLocked,
        } = get();
        await Promise.all([
          loadDefaultSettings(),
          refreshSettings(),
          checkCustomSounds(),
          loadUpdateChecksLocked(),
        ]);

        // Re-fetch settings when the backend changes them (e.g. language
        // reset during model switch). The backend is the source of truth.
        const unlisten = await listen("model-state-changed", () => {
          get().refreshSettings();
        });
        const unlistenSettings = await listen<{
          setting: string;
          value: unknown;
        }>("settings-changed", (event) => {
          const { setting, value } = event.payload;
          if (
            setting === "microphone_priority" &&
            isMicrophonePriority(value)
          ) {
            set((state) => ({
              settings: state.settings
                ? { ...state.settings, microphone_priority: value }
                : null,
            }));
          }
        });
        set({
          initialized: true,
          _unlisten: () => {
            unlisten();
            unlistenSettings();
          },
        });
      })();

      return initInFlight;
    },
  })),
);
