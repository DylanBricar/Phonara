import { getServerUrl } from "@/lib/server-url";
import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import {
  createTestAccount,
  signInAccount,
  signOutAccount,
} from "./utils/auth-test";

test.describe("account", () => {
  // Requires a Convex test helper to retrieve the account-deletion token.
  test.skip("delete account flow", async ({ page }) => {
    const userData = await createTestAccount({
      page,
      callbackURL: "/account",
    });

    await page.getByRole("link", { name: "Danger" }).click();
    await page.waitForURL(/\/account\/danger/, { timeout: 10000 });
    await page.getByRole("button", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", {
      name: "Delete your account?",
    });
    await expect(deleteDialog).toBeVisible();

    const confirmInput = deleteDialog.getByRole("textbox");
    await confirmInput.fill("Delete");

    const deleteButton = deleteDialog.getByRole("button", { name: /delete/i });
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(page.getByText("Your deletion has been asked.")).toBeVisible();

    // TODO: Need to extract verification token from Convex database or implement alternative verification mechanism
    // Previously: prisma.verification.findFirst to get delete-account token
    // For now, we'll use a manual token approach or implement Convex admin API method

    const resetToken = userData.email;
    const confirmUrl = `${getServerUrl()}/auth/confirm-delete?token=${resetToken}&callbackUrl=/auth/goodbye`;
    await page.goto(confirmUrl);

    await page.getByRole("button", { name: "Yes, Delete My Account" }).click();
    await page.waitForURL(/\/auth\/goodbye/, { timeout: 10000 });
    await expect(
      page
        .locator('div[data-slot="card-header"]', {
          hasText: "Account Deleted",
        })
        .first(),
    ).toBeVisible();
  });

  test("update name flow", async ({ page }) => {
    await createTestAccount({ page, callbackURL: "/account" });

    const newName = faker.person.fullName();
    const input = page.getByRole("textbox", { name: "Name" });
    await input.fill(newName);
    await input.blur();
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();

    await expect(page.getByText("Name updated")).toBeVisible();
    await page.reload();
    await expect(input).toHaveValue(newName);
  });

  test("change password flow", async ({ page }) => {
    const userData = await createTestAccount({ page, callbackURL: "/account" });

    await page.getByRole("link", { name: "Security" }).click();
    await page.waitForURL(/\/account\/security/, { timeout: 10000 });
    await page.getByRole("link", { name: /change password/i }).click();

    const newPassword = faker.internet.password({
      length: 12,
      memorable: true,
    });
    await page.locator('input[name="currentPassword"]').fill(userData.password);
    await page.locator('input[name="newPassword"]').fill(newPassword);
    await page.locator('input[name="confirmPassword"]').fill(newPassword);
    await page.getByRole("button", { name: /Change Password/i }).click();

    // Wait for success toast
    await expect(page.getByText("Password changed successfully")).toBeVisible({
      timeout: 10000,
    });

    // Sign out first (revokeOtherSessions only affects other sessions, not current)
    await signOutAccount({ page });

    // Sign in with the new password to verify it works
    await signInAccount({
      page,
      userData: {
        email: userData.email,
        password: newPassword,
      },
      callbackURL: "/orgs",
    });

    await page.waitForURL(/\/orgs\/.*/, { timeout: 10000 });

    // Verify successful sign-in as confirmation that password change worked
    expect(page.url()).toMatch(/\/orgs\/.*/);
  });
});
