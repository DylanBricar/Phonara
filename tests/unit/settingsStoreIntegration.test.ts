import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";
import type { AppSettings, AudioDevice } from "../../src/bindings";
import { asRuntimeSettings } from "../../src/stores/runtimeSettings";
import type { Settings } from "../../src/stores/settingsStoreTypes";
import { useSettingsStore } from "../../src/stores/settingsStore";

const originalState = useSettingsStore.getState();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalConsoleError = console.error;
const store = () => useSettingsStore.getState();
const initialSettings = (): AppSettings => ({
  selected_channel: null,
  audio_feedback: false,
  transcribe_accelerator: "cpu",
  transcribe_gpu_device: null,
  microphone_priority: [],
  bindings: {
    transcribe: {
      id: "transcribe",
      name: "Transcribe",
      description: "Synthetic binding",
      default_binding: "ctrl+space",
      current_binding: "ctrl+space",
    },
  },
});

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: { crypto: globalThis.crypto },
    configurable: true,
  });
  console.error = () => {};
  useSettingsStore.setState(originalState, true);
  store().setSettings(asRuntimeSettings(initialSettings()));
});
afterEach(() => {
  clearMocks();
  useSettingsStore.setState(originalState, true);
  console.error = originalConsoleError;
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

// These are the public control-to-native-command contracts. Exercise the actual
// store, generated IPC bindings and optimistic persistence together.
const booleanSettings = [
  ["audio_feedback", "change_audio_feedback_setting"],
  ["start_hidden", "change_start_hidden_setting"],
  ["autostart_enabled", "change_autostart_setting"],
  ["update_checks_enabled", "change_update_checks_setting"],
  ["show_whats_new_on_update", "change_show_whats_new_on_update_setting"],
  ["translate_to_english", "change_translate_to_english_setting"],
  ["overlay_high_visibility", "change_overlay_high_visibility_setting"],
  ["debug_mode", "change_debug_mode_setting"],
  ["whisper_use_gpu", "change_whisper_use_gpu_setting"],
  ["reliable_paste", "change_reliable_paste_setting"],
  ["auto_submit", "change_auto_submit_setting"],
  ["post_process_enabled", "change_post_process_enabled_setting"],
  ["mute_while_recording", "change_mute_while_recording_setting"],
  ["append_trailing_space", "change_append_trailing_space_setting"],
  ["experimental_enabled", "change_experimental_enabled_setting"],
  ["vad_enabled", "change_vad_enabled_setting"],
  ["filler_word_removal_enabled", "change_filler_word_removal_enabled_setting"],
  ["show_tray_icon", "change_show_tray_icon_setting"],
] as const;

const settingContracts: ReadonlyArray<
  readonly [keyof Settings, unknown, string, Record<string, unknown>]
> = [
  ...booleanSettings.map(
    ([key, command]) => [key, true, command, { enabled: true }] as const,
  ),
  ["always_on_microphone", true, "update_microphone_mode", { alwaysOn: true }],
  [
    "audio_feedback_volume",
    0.75,
    "change_audio_feedback_volume_setting",
    { volume: 0.75 },
  ],
  ["sound_theme", "pop", "change_sound_theme_setting", { theme: "pop" }],
  [
    "whats_new_last_seen_version",
    "0.9.7",
    "change_whats_new_last_seen_version_setting",
    { version: "0.9.7" },
  ],
  [
    "shortcut_activation",
    "toggle",
    "change_shortcut_activation_setting",
    { activation: "toggle" },
  ],
  ["hold_threshold_ms", 200, "change_hold_threshold_ms_setting", { ms: 200 }],
  [
    "selected_microphone",
    "Default",
    "set_selected_microphone",
    { deviceName: "default" },
  ],
  [
    "selected_microphone",
    "WASAPI-synthetic",
    "set_selected_microphone",
    { deviceName: "WASAPI-synthetic" },
  ],
  ["selected_channel", 1, "set_selected_channel", { channel: 1 }],
  ["selected_channel", null, "set_selected_channel", { channel: null }],
  [
    "clamshell_microphone",
    "Default",
    "set_clamshell_microphone",
    { deviceName: "default" },
  ],
  [
    "selected_output_device",
    null,
    "set_selected_output_device",
    { deviceName: "default" },
  ],
  [
    "recording_retention_period",
    "never",
    "update_recording_retention_period",
    { period: "never" },
  ],
  [
    "selected_language",
    "fr",
    "change_selected_language_setting",
    { language: "fr" },
  ],
  [
    "overlay_position",
    "bottom",
    "change_overlay_position_setting",
    { position: "bottom" },
  ],
  [
    "overlay_style",
    "minimal",
    "change_overlay_style_setting",
    { style: "minimal" },
  ],
  ["custom_words", ["Phonara"], "update_custom_words", { words: ["Phonara"] }],
  [
    "text_replacements",
    [{ find: "alpha", replace: "beta", case_sensitive: false }],
    "update_text_replacements",
    {
      replacements: [{ find: "alpha", replace: "beta", case_sensitive: false }],
    },
  ],
  [
    "whisper_initial_prompt",
    null,
    "change_whisper_initial_prompt_setting",
    { prompt: null },
  ],
  [
    "transcription_prompt",
    null,
    "update_transcription_prompt",
    { prompt: null },
  ],
  [
    "word_correction_threshold",
    0.5,
    "change_word_correction_threshold_setting",
    { threshold: 0.5 },
  ],
  ["paste_delay_ms", 15, "change_paste_delay_ms_setting", { ms: 15 }],
  [
    "paste_delay_after_ms",
    20,
    "change_paste_delay_after_ms_setting",
    { ms: 20 },
  ],
  [
    "paste_method",
    "ctrl_v",
    "change_paste_method_setting",
    { method: "ctrl_v" },
  ],
  ["typing_tool", "auto", "change_typing_tool_setting", { tool: "auto" }],
  [
    "external_script_path",
    null,
    "change_external_script_path_setting",
    { path: null },
  ],
  [
    "clipboard_handling",
    "dont_modify",
    "change_clipboard_handling_setting",
    { handling: "dont_modify" },
  ],
  [
    "auto_submit_key",
    "enter",
    "change_auto_submit_key_setting",
    { key: "enter" },
  ],
  ["history_limit", 100, "update_history_limit", { limit: 100 }],
  [
    "post_process_selected_prompt_id",
    "synthetic-prompt",
    "set_post_process_selected_prompt",
    { id: "synthetic-prompt" },
  ],
  ["log_level", "debug", "set_log_level", { level: "debug" }],
  ["app_language", "fr", "change_app_language_setting", { language: "fr" }],
  [
    "vad_backend",
    "silero",
    "change_vad_backend_setting",
    { backend: "silero" },
  ],
  [
    "transcribe_accelerator",
    "cpu",
    "change_transcribe_accelerator_setting",
    { accelerator: "cpu" },
  ],
  [
    "ort_accelerator",
    "cpu",
    "change_ort_accelerator_setting",
    { accelerator: "cpu" },
  ],
  [
    "transcribe_gpu_device",
    null,
    "change_transcribe_gpu_device",
    { device: null },
  ],
  [
    "long_audio_model",
    null,
    "change_long_audio_model_setting",
    { modelId: null },
  ],
  [
    "long_audio_threshold_seconds",
    60,
    "change_long_audio_threshold_setting",
    { threshold: 60 },
  ],
  ["openai_api_key", null, "change_openai_api_key_setting", { apiKey: "" }],
  [
    "openai_model",
    "synthetic-model",
    "change_openai_model_setting",
    { model: "synthetic-model" },
  ],
  [
    "overlay_border_color",
    null,
    "change_overlay_border_color_setting",
    { color: null },
  ],
  [
    "overlay_background_color",
    "#112233",
    "change_overlay_background_color_setting",
    { color: "#112233" },
  ],
  [
    "overlay_border_width",
    2,
    "change_overlay_border_width_setting",
    { width: 2 },
  ],
  [
    "overlay_custom_width",
    400,
    "change_overlay_custom_width_setting",
    { width: 400 },
  ],
  [
    "overlay_custom_height",
    100,
    "change_overlay_custom_height_setting",
    { height: 100 },
  ],
  ["theme_mode", "dark", "change_theme_mode_setting", { mode: "dark" }],
  [
    "accent_color",
    "#112233",
    "change_accent_color_setting",
    { color: "#112233" },
  ],
];

describe("settings control IPC contracts", () => {
  for (const [
    key,
    value,
    expectedCommand,
    expectedPayload,
  ] of settingContracts) {
    test(`${String(key)} persists the intended value (${JSON.stringify(value)})`, async () => {
      const calls: Array<{ command: string; args: unknown }> = [];
      mockIPC((command, args) => {
        calls.push({ command, args });
        expect(store().getSetting(key)).toEqual(value);
        expect(store().isUpdatingKey(String(key))).toBe(true);
        return null;
      });
      await store().updateSetting(key, value as Settings[typeof key]);
      expect(calls).toEqual([
        { command: expectedCommand, args: expectedPayload },
      ]);
      expect(store().getSetting(key)).toEqual(value);
      expect(store().isUpdatingKey(String(key))).toBe(false);
    });
  }

  test("an invalid VAD backend response rolls back the edited setting", async () => {
    store().setSettings(
      asRuntimeSettings({ ...initialSettings(), vad_backend: "earshot" }),
    );
    mockIPC(() => {
      throw "synthetic VAD rejection";
    });
    await store().updateSetting("vad_backend", "silero");
    expect(store().getSetting("vad_backend")).toBe("earshot");
    expect(store().isUpdatingKey("vad_backend")).toBe(false);
  });

  test("reset uses loaded backend defaults and ignores missing defaults", async () => {
    const calls: unknown[] = [];
    mockIPC((command, args) => {
      if (command === "get_default_settings") return { audio_feedback: true };
      calls.push({ command, args });
      return null;
    });
    await store().loadDefaultSettings();
    await store().resetSetting("audio_feedback");
    await store().resetSetting("sound_theme");
    expect(store().settings?.audio_feedback).toBe(true);
    expect(calls).toEqual([
      { command: "change_audio_feedback_setting", args: { enabled: true } },
    ]);
  });
});

describe("settings lifecycle integration", () => {
  test("device discovery deduplicates the default entry and preserves stable identities", async () => {
    const device: AudioDevice = {
      index: "synthetic-device",
      name: "Synthetic microphone",
      is_default: false,
    };
    const defaults: AudioDevice[] = [
      { index: "a", name: "Default", is_default: true },
      { index: "b", name: "default", is_default: true },
    ];
    mockIPC(() => [...defaults, device]);
    await store().refreshAudioDevices();
    await store().refreshOutputDevices();
    const expected = [
      { index: "default", name: "Default", is_default: true },
      device,
    ];
    expect(store().audioDevices).toEqual(expected);
    expect(store().outputDevices).toEqual(expected);
    for (const failure of [
      "synthetic failure",
      new Error("synthetic IPC failure"),
    ]) {
      mockIPC(() => {
        throw failure;
      });
      await store().refreshAudioDevices();
      await store().refreshOutputDevices();
      expect(store().audioDevices).toEqual([expected[0]]);
      expect(store().outputDevices).toEqual([expected[0]]);
    }
  });

  test("audio feedback discovers custom sounds and sends the requested preview", async () => {
    const calls: unknown[] = [];
    mockIPC((command, args) => {
      calls.push({ command, args });
      return { start: true, stop: false };
    });
    await store().checkCustomSounds();
    await store().playTestSound("stop");
    expect(store().customSounds).toEqual({ start: true, stop: false });
    expect(calls[1]).toEqual({
      command: "play_test_sound",
      args: { soundType: "stop" },
    });
    mockIPC(() => {
      throw new Error("synthetic sound failure");
    });
    await store().playTestSound("start");
    await store().checkCustomSounds();
    expect(store().customSounds).toEqual({ start: true, stop: false });
  });

  test("binding rejection restores its old shortcut while successful edits remain", async () => {
    for (const outcome of ["rejected", "failure", "success"]) {
      mockIPC(() => {
        if (outcome === "rejected") throw "synthetic rejection";
        return {
          success: outcome === "success",
          error: "synthetic binding failure",
        };
      });
      if (outcome === "success")
        await store().updateBinding("transcribe", "ctrl+shift+space");
      else
        await expect(
          store().updateBinding("transcribe", "ctrl+shift+space"),
        ).rejects.toThrow();
      expect(store().settings?.bindings?.transcribe.current_binding).toBe(
        outcome === "success" ? "ctrl+shift+space" : "ctrl+space",
      );
      expect(store().isUpdatingKey("binding_transcribe")).toBe(false);
    }
    mockIPC((command) =>
      command === "get_app_settings" ? initialSettings() : { success: true },
    );
    await store().resetBinding("transcribe");
    expect(store().settings?.bindings?.transcribe.current_binding).toBe(
      "ctrl+space",
    );
  });

  test("paired acceleration changes persist atomically and recover from IPC failure", async () => {
    mockIPC((command, args) => {
      expect(command).toBe("change_transcribe_acceleration_setting");
      expect(args).toEqual({ accelerator: "auto", device: "gpu0" });
      return null;
    });
    expect(await store().updateTranscribeAcceleration("auto", "gpu0")).toBe(
      true,
    );
    expect(store().settings?.transcribe_gpu_device).toBe("gpu0");
    mockIPC(() => {
      throw "synthetic device rejection";
    });
    expect(await store().updateTranscribeAcceleration("cpu", null)).toBe(false);
    expect(store().settings?.transcribe_accelerator).toBe("auto");
    expect(store().settings?.transcribe_gpu_device).toBe("gpu0");
  });

  test("failed settings/default/lock reads clear loading without erasing valid settings", async () => {
    for (const failure of [
      "synthetic read failure",
      new Error("synthetic IPC failure"),
    ]) {
      mockIPC(() => {
        throw failure;
      });
      store().setLoading(true);
      await store().refreshSettings();
      await store().loadDefaultSettings();
      await store().loadUpdateChecksLocked();
      expect(store().isLoading).toBe(false);
      expect(store().updateChecksLocked).toBe(false);
      expect(store().settings?.audio_feedback).toBe(false);
    }
  });

  test("concurrent initialization owns one listener set and handles validated backend changes", async () => {
    let settings = initialSettings();
    let appReads = 0;
    mockIPC(
      (command) => {
        switch (command) {
          case "get_app_settings":
            appReads++;
            return structuredClone(settings);
          case "get_default_settings":
            return initialSettings();
          case "check_custom_sounds":
            return { start: false, stop: true };
          case "is_update_checks_locked":
            return true;
          default:
            throw new Error(`Unexpected startup command ${command}`);
        }
      },
      { shouldMockEvents: true },
    );
    await Promise.all([
      store().initialize(),
      store().initialize(),
      store().initialize(),
    ]);
    expect(appReads).toBe(1);
    expect(store().initialized).toBe(true);
    expect(store().updateChecksLocked).toBe(true);
    expect(store().customSounds.stop).toBe(true);
    const priority = [{ id: "synthetic-id", name: "Synthetic microphone" }];
    await emit("settings-changed", {
      setting: "microphone_priority",
      value: priority,
    });
    expect(store().settings?.microphone_priority).toEqual(priority);
    await emit("settings-changed", {
      setting: "microphone_priority",
      value: "invalid",
    });
    expect(store().settings?.microphone_priority).toEqual(priority);
    settings = { ...settings, app_language: "fr" };
    await emit("model-state-changed", {});
    // The event starts a native read; await a read-back before assertions.
    await store().refreshSettings();
    expect(store().settings?.app_language).toBe("fr");
    await store().initialize();
    const callbacks = Reflect.get(window, "__TAURI_INTERNALS__")
      .callbacks as Map<number, unknown>;
    expect(callbacks.size).toBe(2);
    store()._unlisten?.();
    expect(callbacks.size).toBe(0);
  });
});
