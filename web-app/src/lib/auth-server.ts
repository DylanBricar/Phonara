import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { SiteConfig } from "@/site-config";

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? "";
const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ??
  process.env.VITE_CONVEX_SITE_URL ??
  "";
const authCookiePrefix =
  process.env.BETTER_AUTH_COOKIE_PREFIX?.trim() || SiteConfig.appId;

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
  cookiePrefix: authCookiePrefix,
});
