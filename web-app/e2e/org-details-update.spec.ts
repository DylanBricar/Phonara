import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("update organization name", async ({ page }) => {
  // 1. Create a test account (owner)
  await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  // Wait for navigation to complete - we should be redirected to the organization page
  await page.waitForURL(/\/orgs\/[^/]+$/);

  // Extract organization slug from URL
  const currentUrl = page.url();
  const orgSlug = currentUrl.split("/orgs/")[1].split("/")[0];

  // TODO: Verify original org data from Convex database
  // Previously: prisma.organization.findFirst to get original org details
  // For now, retrieve from UI form field

  // 2. Navigate to organization settings page
  await page.goto(`/orgs/${orgSlug}/settings`);

  // 4. Generate a new organization name
  const newOrgName = faker.company.name();

  // Find the input within that card and update it
  const nameInput = page.locator('input[name="name"]');

  // Update the name
  await nameInput.clear();
  await nameInput.fill(newOrgName);
  await nameInput.blur();

  // 6. Click the save button
  await page
    .getByRole("button", { name: "Save Changes", exact: true })
    .last()
    .click();
  await expect(page.getByText("Organization name updated")).toBeVisible();

  // Refresh and verify the change persisted
  await page.reload();

  await page.waitForLoadState("networkidle");

  const nameInput2 = page.locator('input[name="name"]');

  // Verify the name was updated in the UI
  await expect(nameInput2).toHaveValue(newOrgName);
});
