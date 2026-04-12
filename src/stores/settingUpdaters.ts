import type { AppSettings as Settings, TextReplacement, LogLevel } from "@/bindings";
import { commands } from "@/bindings";

export const settingUpdaters: {
  [K in keyof Settings]?: (value: Settings[K]) => Promise<unknown>;
} = {
  always_on_microphone: (value) =>
    commands.updateMicrophoneMode(value as boolean),
  audio_feedback: (value) =>
    commands.changeAudioFeedbackSetting(value as boolean),
  audio_feedback_volume: (value) =>
    commands.changeAudioFeedbackVolumeSetting(value as number),
  sound_theme: (value) => commands.changeSoundThemeSetting(value as string),
  start_hidden: (value) => commands.changeStartHiddenSetting(value as boolean),
  autostart_enabled: (value) =>
    commands.changeAutostartSetting(value as boolean),
  update_checks_enabled: (value) =>
    commands.changeUpdateChecksSetting(value as boolean),
  push_to_talk: (value) => commands.changePttSetting(value as boolean),
  selected_microphone: (value) =>
    commands.setSelectedMicrophone(
      (value as string) === "Default" || value === null
        ? "default"
        : (value as string),
    ),
  clamshell_microphone: (value) =>
    commands.setClamshellMicrophone(
      (value as string) === "Default" ? "default" : (value as string),
    ),
  selected_output_device: (value) =>
    commands.setSelectedOutputDevice(
      (value as string) === "Default" || value === null
        ? "default"
        : (value as string),
    ),
  recording_retention_period: (value) =>
    commands.updateRecordingRetentionPeriod(value as string),
  translate_to_english: (value) =>
    commands.changeTranslateToEnglishSetting(value as boolean),
  selected_language: (value) =>
    commands.changeSelectedLanguageSetting(value as string),
  overlay_position: (value) =>
    commands.changeOverlayPositionSetting(value as string),
  overlay_high_visibility: (value) =>
    commands.changeOverlayHighVisibilitySetting(value as boolean),
  debug_mode: (value) => commands.changeDebugModeSetting(value as boolean),
  custom_words: (value) => commands.updateCustomWords(value as string[]),
  text_replacements: (value) =>
    commands.updateTextReplacements(value as TextReplacement[]),
  whisper_initial_prompt: (value) =>
    commands.changeWhisperInitialPromptSetting(
      (value as string | null) ?? null,
    ),
  transcription_prompt: (value) =>
    commands.updateTranscriptionPrompt((value as string | null) ?? null),
  whisper_use_gpu: (value) =>
    commands.changeWhisperUseGpuSetting(value as boolean),
  word_correction_threshold: (value) =>
    commands.changeWordCorrectionThresholdSetting(value as number),
  paste_method: (value) => commands.changePasteMethodSetting(value as string),
  typing_tool: (value) => commands.changeTypingToolSetting(value as string),
  external_script_path: (value) =>
    commands.changeExternalScriptPathSetting(value as string | null),
  clipboard_handling: (value) =>
    commands.changeClipboardHandlingSetting(value as string),
  auto_submit: (value) => commands.changeAutoSubmitSetting(value as boolean),
  auto_submit_key: (value) =>
    commands.changeAutoSubmitKeySetting(value as string),
  history_limit: (value) => commands.updateHistoryLimit(value as number),
  post_process_enabled: (value) =>
    commands.changePostProcessEnabledSetting(value as boolean),
  post_process_selected_prompt_id: (value) =>
    commands.setPostProcessSelectedPrompt(value as string),
  mute_while_recording: (value) =>
    commands.changeMuteWhileRecordingSetting(value as boolean),
  append_trailing_space: (value) =>
    commands.changeAppendTrailingSpaceSetting(value as boolean),
  log_level: (value) => commands.setLogLevel(value as LogLevel),
  app_language: (value) => commands.changeAppLanguageSetting(value as string),
  experimental_enabled: (value) =>
    commands.changeExperimentalEnabledSetting(value as boolean),
  show_tray_icon: (value) =>
    commands.changeShowTrayIconSetting(value as boolean),
  long_audio_model: (value) =>
    commands.changeLongAudioModelSetting((value as string | null) ?? null),
  long_audio_threshold_seconds: (value) =>
    commands.changeLongAudioThresholdSetting(value as number),
  gemini_api_key: (value) =>
    commands.changeGeminiApiKeySetting((value as string | null) ?? ""),
  gemini_model: (value) => commands.changeGeminiModelSetting(value as string),
  openai_api_key: (value) =>
    commands.changeOpenaiApiKeySetting((value as string | null) ?? ""),
  openai_model: (value) => commands.changeOpenaiModelSetting(value as string),
  overlay_border_color: (value) =>
    commands.changeOverlayBorderColorSetting(
      (value as string | null) ?? null,
    ),
  overlay_background_color: (value) =>
    commands.changeOverlayBackgroundColorSetting(
      (value as string | null) ?? null,
    ),
  overlay_border_width: (value) =>
    commands.changeOverlayBorderWidthSetting(value as number),
  overlay_custom_width: (value) =>
    commands.changeOverlayCustomWidthSetting(value as number),
  overlay_custom_height: (value) =>
    commands.changeOverlayCustomHeightSetting(value as number),
  theme_mode: (value) => commands.changeThemeModeSetting(value as string),
  accent_color: (value) => commands.changeAccentColorSetting(value as string),
};
