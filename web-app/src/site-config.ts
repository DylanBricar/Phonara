const siteTitle = "Parler";
const siteDescription =
  "Free, open-source, offline speech-to-text for your desktop. Press a shortcut, speak, and your words appear in any app — with optional AI clean-up. Nothing leaves your computer.";

export const SiteConfig = {
  title: siteTitle,
  description: siteDescription,
  prodUrl: "https://parler.melvynx.dev",
  appId: "parler-web-app",
  domain: "parler.melvynx.dev",
  appIcon: "/icon.png",
  locale: "en_US",
  /** External links used by the landing page CTAs. */
  github: "https://github.com/Melvynx/Parler",
  downloadUrl: "https://github.com/Melvynx/Parler/releases/latest",
  seo: {
    titleTemplate: `%s | ${siteTitle}`,
    defaultTitle: `${siteTitle} - Offline speech-to-text for your desktop`,
    defaultImage: {
      url: "/images/screenshot.png",
      width: 1280,
      height: 720,
      alt: `${siteTitle} desktop speech-to-text app`,
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
