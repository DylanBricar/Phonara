import { expect, test } from "@playwright/test";

test.describe("sign-in route mask", () => {
  test("header sign-in opens a modal at the real sign-in URL", async ({
    page,
  }) => {
    await page.goto("/docs");

    await page.locator("header").getByRole("link", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/docs\/?$/);
  });

  test("refreshing the masked sign-in URL renders the full sign-in page", async ({
    page,
  }) => {
    await page.goto("/docs");

    await page.locator("header").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/auth\/signin\/?$/);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.reload();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByText("Sign in to manage your website chats."),
    ).toBeVisible();
  });
});
