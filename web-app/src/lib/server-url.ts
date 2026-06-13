import { SiteConfig } from "@/site-config";

function normalizeServerUrl(url?: string) {
  const value = url?.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value)
    ? value
    : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

/**
 * This method return the server URL based on the environment.
 */
export const getServerUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (process.env.PLAYWRIGHT_TEST_BASE_URL) {
    return process.env.PLAYWRIGHT_TEST_BASE_URL;
  }

  const configuredUrl = normalizeServerUrl(
    process.env.SITE_URL ?? process.env.VITE_SITE_URL,
  );
  if (configuredUrl) return configuredUrl;

  // If we are in production, we return the production URL.
  if (process.env.VERCEL_ENV === "production") {
    return SiteConfig.prodUrl;
  }

  // If we are in "stage" environment, we return the staging URL.
  if (process.env.VERCEL_URL) {
    return normalizeServerUrl(process.env.VERCEL_URL) ?? SiteConfig.prodUrl;
  }

  // If we are in development, we return the localhost URL
  return `http://localhost:${process.env.PORT ?? 3000}`;
};
