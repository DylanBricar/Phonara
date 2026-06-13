import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test.describe("Create Organization", () => {
  test("should open organization creation as an intercepted dialog from the org list", async ({
    page,
  }) => {
    await createTestAccount({
      page,
      callbackURL: "/orgs/list",
    });

    await page.goto("/orgs/list");
    await page.getByRole("button", { name: /new organization/i }).click();

    await expect(page).toHaveURL(/\/orgs\/new\/?$/);
    await expect(
      page.getByRole("dialog", { name: "Create organization" }),
    ).toBeVisible();
    await expect(
      page.getByText("Pick a workspace to continue or create a new one."),
    ).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("dialog", { name: "Create organization" }),
    ).toBeHidden();
    await expect(page).toHaveURL(/\/orgs\/list\/?$/);

    await page.getByRole("button", { name: /new organization/i }).click();
    await page.goBack();

    await expect(page).toHaveURL(/\/orgs\/list\/?$/);

    await page.getByRole("button", { name: /new organization/i }).click();
    await expect(
      page.getByRole("dialog", { name: "Create organization" }),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("dialog", { name: "Create organization" }),
    ).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Create a new organization" }),
    ).toBeVisible();
  });

  test("should create a new organization after account creation", async ({
    page,
  }) => {
    // Create and login with a test account
    await createTestAccount({
      page,
      callbackURL: "/orgs",
    });

    await page.waitForURL(/\/orgs\/[^/]+$/);

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Go to the new organization creation page
    await page.goto("/orgs/new");

    // Fill organization form
    const orgName =
      `${faker.animal.bear()}-${faker.string.alphanumeric(3)}`.toLowerCase();
    const expectedSlug = orgName.split(" ").join("-");

    const nameInput = page.locator('input[name="name"]');
    const slugInput = page.locator('input[name="slug"]');

    await expect
      .poll(async () => {
        await nameInput.fill("");
        await nameInput.fill(orgName);
        return slugInput.inputValue();
      })
      .toBe(expectedSlug);
    await slugInput.blur();
    await page.waitForTimeout(1000);

    // Submit form
    await page.getByRole("button", { name: /create organization/i }).click();

    await expect(page).toHaveURL(`/orgs/${expectedSlug}`);

    // Verify that the organization selector contains the organization name
    await expect(page.getByTestId("org-selector")).toContainText(orgName);
  });
});
