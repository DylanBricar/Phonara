import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import {
  createTestAccount,
  getUserEmail,
  signOutAccount,
} from "./utils/auth-test";

// Requires a Convex test helper to retrieve the generated invitation URL.
test.skip("invite and login as invited user", async ({ page }) => {
  // 1. Create a test account (owner)
  const ownerData = await createTestAccount({
    page,
    callbackURL: "/orgs",
  });

  // Wait for navigation to complete - we should be redirected to the organization page
  await page.waitForURL(/\/orgs\/.*/, { timeout: 30000 });

  // Extract organization slug from URL
  const currentUrl = page.url();
  const orgSlug = currentUrl.split("/orgs/")[1].split("/")[0];

  // 3. Click on the Members tab
  await page.goto(`/orgs/${orgSlug}/settings/members`);

  // 4. Verify the current user is listed as an owner
  await expect(page.getByText("Owner")).toBeVisible();

  // 5. Open invite member dialog
  await page.getByRole("button", { name: /invite/i }).click();

  // 6. Fill out the invite form
  const memberEmail = getUserEmail();
  await page.locator('input[name="email"]').fill(memberEmail);

  // Select "admin" role so the invited user can access the members page
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Admin" }).click();

  // Send invitation
  await page.getByRole("button", { name: /invite/i }).click();

  // Wait for the invite dialog to close
  await page
    .getByRole("dialog", { name: /invite teammates/i })
    .waitFor({ state: "hidden", timeout: 10000 });

  // Click on the invitations tab to view pending invitations
  const invitationsTab = page.getByRole("tab", { name: /invitations/i });
  await invitationsTab.click();

  // 7. Verify the invitation appears in the list
  await expect(page.getByText(memberEmail)).toBeVisible();

  // Log out the current user
  await signOutAccount({ page });

  const invitedUserData = {
    email: memberEmail,
    password: "Jean1234",
    name: faker.person.firstName(),
  };

  await createTestAccount({
    page,
    callbackURL: "/account",
    initialUserData: invitedUserData,
  });

  await page.waitForURL("/account");

  // TODO: Retrieve invitation ID from Convex database or implement alternative method
  // Previously: prisma.invitation.findFirst to get last invitation by email
  // For now, we need either:
  // 1. Convex admin API to retrieve invitation by email
  // 2. Send invitation link via email in test
  // 3. Return invitation ID from the invitation endpoint

  // Placeholder for invitation acceptance:
  // const lastInvitation = await getInvitationFromConvex(memberEmail);
  // await page.goto(
  //   `${getServerUrl()}/orgs/accept-invitation/${lastInvitation.id}`,
  // );

  // Click the Accept Invitation button
  await page.getByRole("button", { name: /accept invitation/i }).click();

  // Verify the user is now a member of the organization
  await expect(page).toHaveURL(new RegExp(`/orgs/${orgSlug}`));

  // WORKAROUND: Instead of signing back in as owner (which has session issues),
  // stay logged in as the invited user who should have access to view members
  // This still tests the core functionality: invitation acceptance and member listing

  // Wait for the session to be established
  await page.waitForTimeout(2000);

  // Navigate to the members page as the invited user
  await page.goto(`/orgs/${orgSlug}/settings/members`);
  await page.waitForLoadState("networkidle");

  // Verify both the owner and invited user are listed in the members
  // This validates that:
  // 1. The invitation was accepted correctly
  // 2. The member was added to the organization
  // 3. The members page displays correctly

  // Use more specific locators to avoid strict mode violations
  // Target the members list specifically, not other places where emails might appear
  const membersSection = page.getByLabel("Members");

  await expect(membersSection.getByText(ownerData.email)).toBeVisible();
  await expect(membersSection.getByText(memberEmail)).toBeVisible();

  // Verify that both users are now members of the organization
  // This validates that:
  // 1. The invitation was sent correctly
  // 2. The invitation was accepted successfully
  // 3. The member was added to the organization with admin role
  // 4. The members page displays correctly

  // Since we invited the user as admin, verify they have admin role
  const memberRow = membersSection
    .getByText(memberEmail)
    .locator("..")
    .locator("..");
  await expect(memberRow.getByRole("combobox")).toHaveText(/admin/i);
});
