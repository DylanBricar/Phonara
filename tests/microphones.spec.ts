import { test, expect, type Page } from "@playwright/test";
import type {
  MicrophoneDevice,
  MicrophonePreference,
  MicrophoneStatus,
} from "../src/bindings";

test.setTimeout(60_000);

const devices: MicrophoneDevice[] = [
  { id: "studio-usb", name: "Studio microphone", is_default: false },
  { id: "headset-usb", name: "Headset", is_default: false },
  { id: "builtin", name: "Built-in microphone", is_default: true },
];

interface MicrophoneHarness {
  patch: (patch: Partial<MicrophoneStatus>) => void;
  emit: (event: string, payload: unknown) => void;
  failSave: boolean;
  failRefresh: boolean;
  saveDelay: number;
  refreshDelay: number;
  deferNextSettings: boolean;
  releaseSettings: (() => void) | null;
  saves: MicrophonePreference[][];
  channels: string[];
  listenerCount: (event: string) => number;
}

declare global {
  interface Window {
    microphoneHarness: MicrophoneHarness;
  }
}

async function mockMicrophones(page: Page) {
  await page.addInitScript(
    ({ devices }) => {
      let callbackId = 0;
      const callbacks = new Map<number, (...args: unknown[]) => unknown>();
      const listeners = new Map<number, { event: string; handler: number }>();
      const saved = sessionStorage.getItem("test-microphone-priority");
      let priority: MicrophonePreference[] = saved ? JSON.parse(saved) : [];
      let status: MicrophoneStatus = {
        revision: 1,
        devices,
        active: null,
        next: devices[2],
        is_recording: false,
        error: null,
      };
      const settings = () => ({
        onboarding_completed: true,
        microphone_priority: priority,
        selected_microphone: "Default",
        selected_channel: null,
        keyboard_implementation: "tauri",
        shortcut_activation: "toggle",
        sound_theme: "marimba",
        audio_feedback: false,
        audio_feedback_volume: 0.5,
        show_whats_new_on_update: false,
        update_checks_enabled: false,
        app_language: "en",
        bindings: {},
      });
      const emit = (event: string, payload: unknown) => {
        for (const [id, listener] of listeners) {
          if (listener.event === event) {
            callbacks.get(listener.handler)?.({ event, id, payload });
          }
        }
      };
      const choose = () =>
        priority.flatMap((preference) => {
          const matches = status.devices.filter((device) =>
            preference.id === null
              ? device.name === preference.name
              : device.id === preference.id,
          );
          return matches.length === 1 ? matches : [];
        })[0] ??
        status.devices.find((device) => device.is_default) ??
        status.devices[0] ??
        null;
      status.next = choose();
      window.microphoneHarness = {
        patch: (patch) => {
          status = { ...status, ...patch, revision: status.revision + 1 };
          status.next = choose();
          emit("microphone-status-changed", status);
        },
        emit,
        failSave: false,
        failRefresh: false,
        saveDelay: 0,
        refreshDelay: 0,
        deferNextSettings: false,
        releaseSettings: null,
        saves: [],
        channels: [],
        listenerCount: (event) =>
          [...listeners.values()].filter((listener) => listener.event === event)
            .length,
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
        unregisterListener: (event: string, id: number) => {
          listeners.delete(id);
          callbacks.delete(id);
        },
      });
      Reflect.set(window, "__TAURI_INTERNALS__", {
        callbacks,
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main", windowLabel: "main" },
        },
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          const harness = window.microphoneHarness;
          switch (command) {
            case "get_app_settings": {
              const snapshot = settings();
              if (harness.deferNextSettings) {
                harness.deferNextSettings = false;
                await new Promise<void>((resolve) => {
                  harness.releaseSettings = resolve;
                });
                harness.releaseSettings = null;
              }
              return snapshot;
            }
            case "get_default_settings":
              return settings();
            case "get_microphone_status":
              return status;
            case "refresh_microphone_devices": {
              if (harness.failRefresh) throw "device enumeration failed";
              const snapshot = status;
              if (harness.refreshDelay)
                await new Promise((resolve) =>
                  setTimeout(resolve, harness.refreshDelay),
                );
              return snapshot;
            }
            case "set_microphone_priority": {
              harness.saves.push(args.priority as MicrophonePreference[]);
              if (harness.saveDelay)
                await new Promise((resolve) =>
                  setTimeout(resolve, harness.saveDelay),
                );
              if (harness.failSave) throw "persistence failed";
              priority = args.priority as MicrophonePreference[];
              sessionStorage.setItem(
                "test-microphone-priority",
                JSON.stringify(priority),
              );
              status = {
                ...status,
                revision: status.revision + 1,
                next: choose(),
              };
              emit("microphone-status-changed", status);
              return null;
            }
            case "get_microphone_channels":
              harness.channels.push(args.deviceName as string);
              return args.deviceName === "studio-usb" ? 2 : 1;
            case "get_available_microphones":
              return devices.map((device) => ({ ...device, index: device.id }));
            case "get_available_output_devices":
            case "get_available_models":
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
        transformCallback: (
          callback: (...args: unknown[]) => unknown,
          once = false,
        ) => {
          const id = callbackId++;
          callbacks.set(id, (...args) => {
            if (once) callbacks.delete(id);
            return callback(...args);
          });
          return id;
        },
        unregisterCallback: (id: number) => callbacks.delete(id),
        runCallback: (id: number, ...args: unknown[]) =>
          callbacks.get(id)?.(...args),
      });
    },
    { devices },
  );
}

const editor = (page: Page) => page.getByTestId("microphone-priority");
const add = (page: Page, id: string) =>
  editor(page)
    .getByRole("combobox", { name: "Add a microphone" })
    .selectOption(id);
const orderedIds = (page: Page) =>
  editor(page)
    .getByRole("listitem")
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-microphone-id")),
    );

test.beforeEach(async ({ page }) => {
  await mockMicrophones(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(editor(page)).toBeVisible();
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Built-in microphone",
  );
});

test("adds, reorders, removes and resets persisted priorities", async ({
  page,
}) => {
  await expect(editor(page)).toContainText(
    "Following the system default microphone.",
  );
  await add(page, "builtin");
  await add(page, "headset-usb");
  await add(page, "studio-usb");
  await editor(page)
    .getByRole("button", { name: "Move Studio microphone up" })
    .click();
  await editor(page)
    .getByRole("button", { name: "Move Studio microphone up" })
    .click();
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "builtin", "headset-usb"]);
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Studio microphone",
  );
  await editor(page).screenshot({
    path: "test-results/microphone-priority-list.png",
  });
  await page.reload();
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "builtin", "headset-usb"]);
  await editor(page)
    .getByRole("button", { name: "Remove Built-in microphone from priorities" })
    .click();
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
  await editor(page)
    .getByRole("button", { name: "Use system default" })
    .click();
  await expect(editor(page).getByRole("listitem")).toHaveCount(0);
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Built-in microphone",
  );
});

test("shows runtime device issues without claiming the device scan failed", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(() =>
    window.microphoneHarness.patch({
      error: "unable to open preferred microphone",
    }),
  );
  await expect(editor(page).getByRole("alert")).toContainText(
    "A microphone could not be used or checked.",
  );
  await expect(editor(page).getByRole("alert")).not.toContainText(
    "Could not update microphone availability.",
  );
  await expect.poll(() => orderedIds(page)).toEqual(["studio-usb"]);
});

test("ignores an old refresh result after a newer device event", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await add(page, "headset-usb");
  await page.evaluate(() => {
    window.microphoneHarness.refreshDelay = 250;
  });
  await editor(page)
    .getByRole("button", { name: "Refresh microphones" })
    .click();
  await page.evaluate(
    (devices) => window.microphoneHarness.patch({ devices: devices.slice(1) }),
    devices,
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Headset",
  );
  await expect(
    editor(page).getByRole("button", { name: "Refresh microphones" }),
  ).toBeEnabled();
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Headset",
  );
  await expect(editor(page).getByRole("listitem").first()).toContainText(
    "Disconnected",
  );
});

test("accepts backend priority updates and ignores malformed settings events", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.microphoneHarness.emit("settings-changed", {
      setting: "microphone_priority",
      value: [{ id: "studio-usb", name: "Studio microphone" }],
    }),
  );
  await expect.poll(() => orderedIds(page)).toEqual(["studio-usb"]);
  await page.evaluate(() =>
    window.microphoneHarness.emit("settings-changed", {
      setting: "microphone_priority",
      value: [{ id: 12, name: null }],
    }),
  );
  await expect.poll(() => orderedIds(page)).toEqual(["studio-usb"]);
});

test("a delayed settings refresh cannot overwrite a newly saved microphone order", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(() => {
    window.microphoneHarness.deferNextSettings = true;
    window.microphoneHarness.emit("model-state-changed", {});
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.microphoneHarness.releaseSettings !== null),
    )
    .toBe(true);
  await add(page, "headset-usb");
  await expect(editor(page).getByRole("combobox")).toBeEnabled();
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
  await page.evaluate(() => window.microphoneHarness.releaseSettings?.());
  await expect
    .poll(() => page.evaluate(() => window.microphoneHarness.releaseSettings))
    .toBeNull();
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
});

test("saving a legacy collision sends one device at its highest priority", async ({
  page,
}) => {
  await page.evaluate(() =>
    sessionStorage.setItem(
      "test-microphone-priority",
      JSON.stringify([
        { id: null, name: "Studio microphone" },
        { id: "headset-usb", name: "Headset" },
        { id: "studio-usb", name: "Studio microphone" },
      ]),
    ),
  );
  await page.reload();
  await add(page, "builtin");
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb", "builtin"]);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.microphoneHarness.saves.at(-1)?.map(({ id }) => id),
      ),
    )
    .toEqual(["studio-usb", "headset-usb", "builtin"]);
});

test("reports no microphones while keeping saved priorities and refreshes after remount", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(() => window.microphoneHarness.patch({ devices: [] }));
  await expect(editor(page).getByRole("status")).toContainText(
    "No microphone available for the next dictation.",
  );
  await expect(editor(page).getByRole("listitem")).toContainText(
    "Disconnected",
  );
  await page.getByRole("tab", { name: "About", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.microphoneHarness.listenerCount("microphone-status-changed"),
      ),
    )
    .toBe(0);
  await page.evaluate(
    (devices) => window.microphoneHarness.patch({ devices }),
    devices,
  );
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Studio microphone",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.microphoneHarness.listenerCount("microphone-status-changed"),
      ),
    )
    .toBe(1);
});

test("shows a legacy preference as connected and saves its stable device identity", async ({
  page,
}) => {
  await page.evaluate(() =>
    sessionStorage.setItem(
      "test-microphone-priority",
      JSON.stringify([{ id: null, name: "Studio microphone" }]),
    ),
  );
  await page.reload();
  await expect(editor(page).getByRole("listitem")).toContainText("Connected");
  await expect(
    editor(page).getByRole("option", {
      name: "Studio microphone",
      exact: true,
    }),
  ).toHaveCount(0);
  await add(page, "headset-usb");
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
});

test("keeps disconnected preferences in place and restores them on reconnection", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await add(page, "headset-usb");
  await page.evaluate(
    (devices) => window.microphoneHarness.patch({ devices: devices.slice(1) }),
    devices,
  );
  await expect(editor(page).getByRole("listitem").first()).toContainText(
    "Disconnected",
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Headset",
  );
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
  await page.evaluate(
    (devices) => window.microphoneHarness.patch({ devices }),
    devices,
  );
  await expect(editor(page).getByRole("listitem").first()).toContainText(
    "Connected",
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Studio microphone",
  );
  await expect
    .poll(() => orderedIds(page))
    .toEqual(["studio-usb", "headset-usb"]);
});

test("distinguishes recording and next microphone, ignores stale events and uses effective channel identity", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(
    (devices) =>
      window.microphoneHarness.patch({
        active: devices[1],
        is_recording: true,
      }),
    devices,
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "In use: Headset",
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Studio microphone",
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "The microphone will change after this dictation.",
  );
  await expect
    .poll(() => page.evaluate(() => window.microphoneHarness.channels.at(-1)))
    .toBe("headset-usb");
  await page.evaluate(() =>
    window.microphoneHarness.emit("microphone-status-changed", {
      revision: 0,
      devices: [],
      active: null,
      next: null,
      is_recording: false,
      error: null,
    }),
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "In use: Headset",
  );
  await page.evaluate(() =>
    window.microphoneHarness.patch({ active: null, is_recording: false }),
  );
  await expect(editor(page).getByRole("status")).not.toContainText("In use:");
  await expect
    .poll(() => page.evaluate(() => window.microphoneHarness.channels.at(-1)))
    .toBe("studio-usb");
  await page.screenshot({
    path: "test-results/microphone-priorities.png",
    fullPage: true,
  });
});

test("keeps saved order on a command error and prevents overlapping edits", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(() => {
    window.microphoneHarness.failSave = true;
    window.microphoneHarness.saveDelay = 250;
  });
  await editor(page)
    .getByRole("button", { name: "Use system default" })
    .click();
  await expect(editor(page).getByRole("combobox")).toBeDisabled();
  await expect(
    editor(page).getByRole("button", {
      name: "Remove Studio microphone from priorities",
    }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Could not save microphone priorities. Your previous order has been kept.",
    ),
  ).toBeVisible();
  await expect.poll(() => orderedIds(page)).toEqual(["studio-usb"]);
  await expect
    .poll(() => page.evaluate(() => window.microphoneHarness.saves.length))
    .toBe(2);
});

test("keeps last known devices when enumeration fails and recovers on refresh", async ({
  page,
}) => {
  await add(page, "studio-usb");
  await page.evaluate(() => {
    window.microphoneHarness.failRefresh = true;
  });
  await editor(page)
    .getByRole("button", { name: "Refresh microphones" })
    .click();
  await expect(editor(page).getByRole("alert")).toContainText(
    "Could not update microphone availability.",
  );
  await expect(editor(page).getByRole("listitem")).toContainText("Connected");
  await page.evaluate(() => {
    window.microphoneHarness.failRefresh = false;
  });
  await editor(page)
    .getByRole("button", { name: "Refresh microphones" })
    .click();
  await expect(editor(page).getByRole("alert")).toHaveCount(0);
});

test("new devices are offered without promotion and identical names stay distinguishable", async ({
  page,
}) => {
  await add(page, "builtin");
  await page.evaluate(
    (devices) =>
      window.microphoneHarness.patch({
        devices: [
          ...devices,
          { id: "duplicate-a", name: "USB microphone", is_default: false },
          { id: "duplicate-b", name: "USB microphone", is_default: false },
        ],
      }),
    devices,
  );
  await expect(editor(page).getByRole("status")).toContainText(
    "Next dictation: Built-in microphone",
  );
  await expect.poll(() => orderedIds(page)).toEqual(["builtin"]);
  await expect(
    editor(page).getByRole("option", {
      name: "USB microphone (duplicate-a)",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    editor(page).getByRole("option", {
      name: "USB microphone (duplicate-b)",
      exact: true,
    }),
  ).toHaveCount(1);
  await add(page, "duplicate-b");
  await expect(editor(page).getByRole("listitem").last()).toContainText(
    "duplicate-b",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.microphoneHarness.listenerCount("microphone-status-changed"),
      ),
    )
    .toBe(1);
});
