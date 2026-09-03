import { test, expect } from "@playwright/test";

test.describe("Phonara App", () => {
  test("dev server responds", async ({ page }) => {
    // Just verify the dev server is running and responds
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("page has html structure", async ({ page }) => {
    await page.goto("/");

    // Verify basic HTML structure exists
    const html = await page.content();
    expect(html).toContain("<html");
    expect(html).toContain("<body");
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
