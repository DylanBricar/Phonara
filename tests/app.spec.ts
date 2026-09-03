import { test, expect } from "@playwright/test";

test.describe("Phonara App", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let callbackId = 0;
      const callbacks = new Map<number, (...args: unknown[]) => unknown>();

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
        unregisterListener: (id: number) => callbacks.delete(id),
      });
      Reflect.set(window, "__TAURI_INTERNALS__", {
        callbacks,
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { label: "main", windowLabel: "main" },
        },
        invoke: async (command: string) => {
          switch (command) {
            case "get_app_settings":
              return {};
            case "get_available_models":
              return [];
            case "get_current_model":
              return "";
            case "plugin:os|locale":
              return "en-US";
            case "plugin:event|listen":
              return callbackId;
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
    });
  });

  test("dev server responds", async ({ page }) => {
    // Just verify the dev server is running and responds
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("renders without unhandled browser errors", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/");

    await expect(page.locator("#root")).not.toBeEmpty();
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("loads a non-English locale on demand", async ({ page }) => {
    await page.goto("/");

    const translated = await page.evaluate(async () => {
      const { default: i18n } = await import("/src/i18n/index.ts");
      await i18n.changeLanguage("fr");
      return {
        language: i18n.language,
        settings: i18n.t("tray.settings"),
      };
    });

    expect(translated).toEqual({
      language: "fr",
      settings: "Paramètres...",
    });
  });
});
