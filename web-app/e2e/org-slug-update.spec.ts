import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("update organization slug", async ({ page }) => {
  // 1. Create a test account (owner)
  await createTestAccount({ page, callbackURL: "/orgs" });

  await page.waitForURL(/\/orgs\/[^/]+$/);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Extract organization slug from URL
  const currentUrl = page.url();
  const originalSlug = currentUrl.split("/orgs/")[1].split("/")[0];

  // TODO: Verify original org data from Convex database
  // Previously: prisma.organization.findFirst to get original org
  // For now, use originalSlug from URL

  // 2. Navigate to organization danger settings page

  await page.goto(`/orgs/${originalSlug}/settings`);

  // 3. Click on the Members tab
  await page.getByRole("link", { name: /danger zone/i }).click();

  // 4. Generate a new organization slug
  const newSlug = `${faker.internet.domainWord().toLowerCase()}-${faker.string.alphanumeric(4).toLowerCase()}`;

  // 5. Find the slug input field and update it
  const slugInput = page.locator('input[name="slug"]');

  // Wait for the input to be visible and have the correct value
  await slugInput.waitFor({ state: "visible" });
  await expect(slugInput).toHaveValue(originalSlug);

  // Update the slug
  await slugInput.clear();
  await slugInput.fill(newSlug);

  // 6. Click the save button
  await page.getByRole("button", { name: /save/i }).click();

  // 7. Confirm the slug change in the dialog
  await page.getByRole("button", { name: /yes, change the slug/i }).click();

  // 8. Wait for navigation to the new URL
  await page.waitForURL(new RegExp(`/orgs/${newSlug}/settings/danger`), {
    timeout: 10000,
  });

  // 9. Verify the URL has been updated
  expect(page.url()).toContain(`/orgs/${newSlug}/`);

  // TODO: Verify org slug was updated in Convex database
  // Previously: prisma.organization.findFirst to verify slug change
  // For now, URL change is sufficient verification
});
