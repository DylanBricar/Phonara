async function globalTeardown() {
  // TODO: Implement cleanup using Convex admin API when available
  // Previously used: prisma.user.deleteMany for test users with "playwright-test-" prefix
  // Convex doesn't support direct database mutations from test context yet

  // eslint-disable-next-line no-console
  console.info(
    "Skipping cleanup: Convex cleanup requires admin API implementation",
  );
}

export default globalTeardown;
