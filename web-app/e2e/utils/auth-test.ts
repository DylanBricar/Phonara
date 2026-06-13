import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";
import type { Page } from "@playwright/test";

export const getUserEmail = () =>
  `playwright-test-${faker.internet.email().toLowerCase()}`;

/**
 * Helper function to create a test account
 * @returns Object containing the test user's credentials
 */
export async function createTestAccount(options: {
  page: Page;
  callbackURL?: string;
  initialUserData?: { name: string; email: string; password: string };
  admin?: boolean;
}) {
  // Generate fake user data
  const userData = options.initialUserData ?? {
    name: faker.person.fullName(),
    email: getUserEmail(),
    password: faker.internet.password({ length: 12, memorable: true }),
  };

  // Navigate to signup page
  const signupUrl = options.callbackURL
    ? `/auth/signup?callbackUrl=${encodeURIComponent(options.callbackURL)}`
    : "/auth/signup";
  await options.page.goto(signupUrl);

  // Fill out the form
  await options.page.locator('input[name="name"]').fill(userData.name);
  await options.page.locator('input[name="email"]').fill(userData.email);
  await options.page.locator('input[name="password"]').fill(userData.password);
  await options.page
    .locator('input[name="verifyPassword"]')
    .fill(userData.password);

  // Submit the form
  await options.page.getByRole("button", { name: /sign up/i }).click();

  // Wait for navigation to complete - we should be redirected to the callback URL
  if (options.callbackURL) {
    await options.page.waitForLoadState("networkidle");
    // Extract pathname from callbackURL and match it regardless of domain
    const callbackPath = new URL(options.callbackURL, "http://localhost")
      .pathname;
    await options.page.waitForURL(
      new RegExp(
        `^[^/]*//[^/]*${callbackPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
      {
        timeout: 30000,
      },
    );
  }

  if (options.admin) {
    // TODO: Implement admin promotion via Convex admin API
    // For now, admin promotion needs to be done through the Convex dashboard
    logger.info("Admin user creation requested - manual promotion needed", {
      email: userData.email,
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return userData;
}

/**
 * Helper function to sign in with an existing account
 * @returns Object containing the user's credentials
 */
export async function signInAccount(options: {
  page: Page;
  userData: { email: string; password: string };
  callbackURL?: string;
}) {
  const { page, userData, callbackURL } = options;

  // Navigate to signin page
  const signInUrl = callbackURL
    ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackURL)}`
    : "/auth/signin";
  await page.goto(signInUrl);

  // Click on the "Use password" button
  await page.getByRole("button", { name: /use password/i }).click();

  // Fill out the form
  await page.locator('input[name="email"]').fill(userData.email);
  await page.locator('input[name="password"]').fill(userData.password);

  // Submit the form
  await page
    .getByRole("button", { name: /sign in/i })
    .first()
    .click();

  // Wait for navigation to complete if a callback URL is provided
  if (callbackURL) {
    try {
      // Extract pathname from callbackURL and match it regardless of domain
      const callbackPath = new URL(callbackURL, "http://localhost").pathname;
      await page.waitForURL(
        new RegExp(
          `^[^/]*//[^/]*${callbackPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        ),
        { timeout: 30000 },
      );
    } catch (error) {
      logger.error("Error waiting for navigation to complete", error);
    }
  }

  return userData;
}

/**
 * Helper function to sign out the current user
 * @param page - Playwright page object
 */
export async function signOutAccount(options: { page: Page }) {
  const { page } = options;

  // Navigate to account page
  await page.goto(`/account`);
  await page.waitForLoadState("networkidle");

  // Check if we're already logged out (401 error or redirected to signin)
  const currentUrl = page.url();
  if (currentUrl.includes("/auth/signin")) {
    return; // Already logged out
  }

  // Check for 401 error (user session was invalidated)
  const unauthorizedText = page.getByText("Unauthorized");
  if (await unauthorizedText.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Session was invalidated, navigate to signin
    await page.goto("/auth/signin");
    return;
  }

  // Wait for and click the sign out button
  const signOutButton = page.getByRole("button", { name: /sign out/i });
  await signOutButton.scrollIntoViewIfNeeded();
  await signOutButton.click();

  await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
}
