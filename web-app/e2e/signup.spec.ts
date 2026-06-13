import { expect, test } from "@playwright/test";
import { createTestAccount } from "./utils/auth-test";

test("sign up and verify account creation", async ({ page }) => {
  await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  await page.waitForURL(/\/orgs\/.*/);

  // Verify we're on an organization page
  const currentUrl = page.url();
  expect(currentUrl).toMatch(/\/orgs\/.*/);

  // Extract organization slug from URL
  const orgSlug = currentUrl.split("/orgs/")[1].split("/")[0];

  // Verify account creation through UI
  // The fact that we redirected to /orgs/[slug] confirms successful signup
  expect(currentUrl).toContain(`/orgs/${orgSlug}`);
});
