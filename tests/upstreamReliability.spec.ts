import { expect, test } from "@playwright/test";
import type { HistoryEntry } from "../src/bindings";

test.setTimeout(60_000);

declare global {
  interface Window {
    historyHarness: {
      failDelete: boolean;
      emitAdded: (id: number, text: string) => void;
      emitNoModel: () => void;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let callbackId = 0;
    const callbacks = new Map<number, (...args: unknown[]) => unknown>();
    const listeners = new Map<number, { event: string; handler: number }>();
    const entry = (id: number, text = `Dictation ${id}`): HistoryEntry => ({
      id,
      file_name: `${id}.wav`,
      timestamp: 1_760_000_000 + id,
      saved: false,
      title: "",
      transcription_text: text,
      post_processed_text: null,
      post_process_prompt: null,
      post_process_requested: false,
    });
    window.historyHarness = {
      failDelete: false,
      emitNoModel: () => {
        for (const [listenerId, listener] of listeners) {
          if (listener.event === "recording-error") {
            callbacks.get(listener.handler)?.({
              event: listener.event,
              id: listenerId,
              payload: { error_type: "no_model", detail: null },
            });
          }
        }
      },
      emitAdded: (id, text) => {
        for (const [listenerId, listener] of listeners) {
          if (listener.event === "history-update-payload") {
            callbacks.get(listener.handler)?.({
              event: listener.event,
              id: listenerId,
              payload: { action: "added", entry: entry(id, text) },
            });
          }
        }
      },
    };
    const settings = {
      onboarding_completed: true,
      app_language: "en",
      show_whats_new_on_update: false,
      update_checks_enabled: false,
      keyboard_implementation: "tauri",
      shortcut_activation: "toggle",
      sound_theme: "marimba",
      audio_feedback: true,
      audio_feedback_volume: 0.5,
      selected_microphone: "Default",
      microphone_priority: [],
      bindings: {},
    };
    Reflect.set(window, "__TAURI_OS_PLUGIN_INTERNALS__", {
      platform: "linux",
      version: "test",
      family: "unix",
      os_type: "linux",
      arch: "x86_64",
      exe_extension: "",
      eol: "\n",
    });
    Reflect.set(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
      unregisterListener: (_event: string, id: number) => listeners.delete(id),
    });
    Reflect.set(window, "__TAURI_INTERNALS__", {
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { label: "main", windowLabel: "main" },
      },
      invoke: async (command: string, args: Record<string, unknown> = {}) => {
        switch (command) {
          case "get_app_settings":
          case "get_default_settings":
            return settings;
          case "get_history_entries":
            return args.cursor == null
              ? { entries: [entry(2)], has_more: true }
              : { entries: [entry(2), entry(1)], has_more: false };
          case "delete_history_entry":
            if (window.historyHarness.failDelete) throw "database write failed";
            return null;
          case "get_microphone_status":
          case "refresh_microphone_devices":
            return {
              revision: 1,
              devices: [],
              unavailable: [],
              active: null,
              next: null,
              is_recording: false,
              error: null,
            };
          case "get_available_models":
          case "get_available_microphones":
          case "get_available_output_devices":
            return [];
          case "get_current_model":
            return "";
          case "check_custom_sounds":
            return { start: false, stop: false };
          case "plugin:app|identifier":
            return "com.phonara.test";
          case "plugin:app|version":
            return "0.9.1";
          case "plugin:os|locale":
            return "en-US";
          case "plugin:event|listen": {
            const id = callbackId++;
            listeners.set(id, {
              event: args.event as string,
              handler: args.handler as number,
            });
            return id;
          }
          case "plugin:event|unlisten":
            listeners.delete(args.eventId as number);
            return null;
          default:
            return null;
        }
      },
      transformCallback: (callback: (...args: unknown[]) => unknown) => {
        const id = callbackId++;
        callbacks.set(id, callback);
        return id;
      },
      unregisterCallback: (id: number) => callbacks.delete(id),
      runCallback: (id: number, ...args: unknown[]) =>
        callbacks.get(id)?.(...args),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("tab", { name: "History", exact: true }),
  ).toBeVisible();
});

test("history keeps one row per dictation during overlapping pages and live events", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(page.getByText("Dictation 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Dictation 2", { exact: true })).toHaveCount(1);
  await page.evaluate(() => {
    window.historyHarness.emitAdded(3, "Live dictation");
    window.historyHarness.emitAdded(3, "Updated live dictation");
  });
  await expect(
    page.getByText("Updated live dictation", { exact: true }),
  ).toHaveCount(1);
  await expect(page.getByText("Live dictation", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", {
      name: "Copy transcription to clipboard",
      exact: true,
    }),
  ).toHaveCount(3);
});

test("failed history deletion restores the row and reports the error", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(page.getByText("Dictation 1", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.historyHarness.failDelete = true;
  });
  await page
    .getByRole("button", { name: "Delete entry", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Failed to delete entry. Please try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Dictation 2", { exact: true })).toHaveCount(1);
});

test("settings controls have names and Escape returns focus to the dropdown", async ({
  page,
}) => {
  await expect(
    page.getByRole("checkbox", { name: "Mute While Recording", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveCount(1);
  const trigger = page.getByRole("button", { name: "Marimba", exact: true });
  await trigger.click();
  const option = page.getByRole("button", { name: "Pop", exact: true });
  await expect(option).toBeVisible();
  await option.focus();
  await page.keyboard.press("Escape");
  await expect(option).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("opening another settings section resets its scroll position", async ({
  page,
}) => {
  const scroll = page
    .locator(".overflow-y-auto")
    .filter({ has: page.getByTestId("microphone-priority") });
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => scroll.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.getByRole("tab", { name: "History", exact: true }).click();
  const historyScroll = page
    .locator(".overflow-y-auto")
    .filter({ has: page.getByText("Dictation 2", { exact: true }) });
  await expect
    .poll(() => historyScroll.evaluate((element) => element.scrollTop))
    .toBe(0);
});

test("an unavailable transcription model reports a localized recovery action", async ({
  page,
}) => {
  await page.evaluate(() => window.historyHarness.emitNoModel());
  await expect(
    page.getByText(
      "Select a transcription model or download additional models. Different models offer varying levels of accuracy and speed.",
      { exact: true },
    ),
  ).toBeVisible();
});
