const siteTitle = "Parler";
const siteDescription =
  "Private audio links with synced transcripts from the Parler desktop app";

export const SiteConfig = {
  title: siteTitle,
  description: siteDescription,
  prodUrl: "https://parler.melvynx.dev",
  appId: "parler-web-app",
  domain: "parler.melvynx.dev",
  appIcon: "/icon.png",
  locale: "en_US",
  seo: {
    titleTemplate: `%s | ${siteTitle}`,
    defaultTitle: `${siteTitle} - Audio links with live transcripts`,
    defaultImage: {
      url: "/images/screenshot.png",
      width: 1280,
      height: 720,
      alt: `${siteTitle} audio transcript player`,
    },
  },
  company: {
    name: `${siteTitle}`,
    address: "421 Rue de Paris, France", // Remove if not needed
    contactEmail: "melvyn@melvynx.com",
  },
  brand: {
    primary: "#0f766e",
    ogImage: {
      background: "#050505",
      foreground: "#fafafa",
      mutedForeground: "#a1a1aa",
      border: "#27272a",
      accent: "#14b8a6",
    },
  },
  team: {
    image: "https://github.com/melvynx.png",
    website: "https://melvynx.com",
    twitter: "https://twitter.com/melvyn_me",
    name: "Melvynx",
  },
  features: {
    /**
     * If enabled, logged-in users will be redirected to `/orgs` when visiting `/`.
     * Logged-out users still see the public landing page.
     */
    enableLandingRedirection: true as boolean,
  },
};
