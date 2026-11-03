import { expect, test } from "@playwright/test";
import type {} from "./fixtures/upstream-ime";

for (const composition of [
  { label: "active composition", isComposing: true, keyCode: 13 },
  { label: "IME boundary code 229", isComposing: false, keyCode: 229 },
]) {
  test(`custom words ignores Enter during ${composition.label}, then accepts normal Enter`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/upstream-ime.html");
    const input = page.getByPlaceholder("Add a word or phrase", {
      exact: true,
    });
    await input.fill("東京");
    await input.dispatchEvent("compositionstart", { data: "東京" });
    await input.dispatchEvent("keydown", {
      key: "Enter",
      code: "Enter",
      isComposing: composition.isComposing,
      keyCode: composition.keyCode,
    });
    await expect(input).toHaveValue("東京");
    await expect(page.getByText("東京", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.imeFixture.writes)).toEqual([]);

    await input.dispatchEvent("compositionend", { data: "東京" });
    await input.press("Enter");
    await expect(input).toHaveValue("");
    await expect(page.getByText("東京", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.imeFixture.writes)).toEqual([
      { command: "update_custom_words", args: { words: ["東京"] } },
    ]);
  });

  test(`language picker ignores Enter during ${composition.label}, then accepts normal Enter`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/upstream-ime.html");
    await page
      .getByRole("button", { name: "Auto Detect", exact: true })
      .click();
    const input = page.getByPlaceholder("Search languages...", { exact: true });
    await input.fill("French");
    await input.dispatchEvent("compositionstart", { data: "French" });
    await input.dispatchEvent("keydown", {
      key: "Enter",
      code: "Enter",
      isComposing: composition.isComposing,
      keyCode: composition.keyCode,
    });
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("French");
    await expect(
      page.getByRole("button", { name: "Auto Detect", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.imeFixture.writes)).toEqual([]);

    await input.dispatchEvent("compositionend", { data: "French" });
    await input.press("Enter");
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "French", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.imeFixture.writes)).toEqual([
      { command: "change_selected_language_setting", args: { language: "fr" } },
    ]);
  });
}
