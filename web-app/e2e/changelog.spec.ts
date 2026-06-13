import { expect, test } from "@playwright/test";

test.describe("changelog", () => {
  test("changelog page displays timeline with items", async ({ page }) => {
    await page.goto("/changelog");

    await expect(
      page.getByRole("heading", { name: "Changelog", exact: true }),
    ).toBeVisible();

    const changelogItems = page.locator("[data-changelog-item]");
    await expect(changelogItems.first()).toBeVisible();

    const count = await changelogItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking changelog item opens a detail dialog", async ({ page }) => {
    await page.goto("/changelog");
    await page.locator('[data-changelog-ready="true"]').waitFor();

    const firstItem = page.locator("[data-changelog-item]").first();
    await firstItem.click();

    await expect(page).toHaveURL(/\/changelog\/[^/?#]+\/?$/);
    await expect(page.locator("[data-changelog-dialog]")).toBeVisible();
    await expect(page.locator("[data-changelog-dialog] .prose")).toBeVisible();

    await page.getByRole("button", { name: /open page/i }).click();
    await expect(page.locator("[data-changelog-dialog]")).toBeHidden();
    await expect(page).toHaveURL(/\/changelog\/[^/?#]+\/?$/);
    await expect(page.locator(".prose")).toBeVisible();
  });

  test("refreshing an intercepted changelog URL renders the full detail page", async ({
    page,
  }) => {
    await page.goto("/changelog");
    await page.locator('[data-changelog-ready="true"]').waitFor();

    await page.locator("[data-changelog-item]").first().click();
    await expect(page).toHaveURL(/\/changelog\/[^/?#]+\/?$/);
    await expect(page.locator("[data-changelog-dialog]")).toBeVisible();

    await page.reload();

    await expect(page.locator("[data-changelog-dialog]")).toBeHidden();
    await expect(page.locator(".prose")).toBeVisible();
  });

  test("changelog detail page is accessible via direct URL", async ({
    page,
  }) => {
    await page.goto("/changelog/2026-03-05-v240");

    await expect(page.locator(".prose")).toBeVisible();
  });
});
