import { SiteConfig } from "@/site-config";
import type { JSX } from "react";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

type SeoImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
};

type SeoOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | SeoImage | null;
  type?: "website" | "article";
  keywords?: string[];
  tags?: string[];
  robots?: string;
  noindex?: boolean;
  publishedTime?: Date | string;
  modifiedTime?: Date | string;
  section?: string;
  jsonLd?: JsonLdValue | JsonLdValue[];
  canonical?: boolean;
};

type NoIndexHeadOptions = {
  title: string;
  description?: string;
  path?: string;
  section?: string;
};

type BreadcrumbItem = {
  name: string;
  path?: string;
};

export type SitemapEntry = {
  path: string;
  lastmod?: Date | string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  image?: string | SeoImage | null;
};

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const defaultRobots = "index, follow, max-image-preview:large, max-snippet:-1";

type RuntimeImportMeta = {
  env?: Record<string, boolean | string | undefined>;
};

function getViteEnvValue(key: string) {
  const env = (import.meta as unknown as RuntimeImportMeta).env;
  if (!env) return undefined;
  const value = env[key];
  return typeof value === "string" ? value : undefined;
}

function isViteDev() {
  const env = (import.meta as unknown as RuntimeImportMeta).env;
  if (!env) return false;
  return env.DEV === true;
}

function getProcessEnv(key: string) {
  if (typeof process === "undefined") return undefined;
  return process.env[key];
}

function normalizeBaseUrl(url: string) {
  const value = url.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value)
    ? value
    : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function getConfiguredSiteUrl() {
  return (
    getProcessEnv("SITE_URL") ??
    getProcessEnv("VITE_SITE_URL") ??
    getViteEnvValue("VITE_SITE_URL")
  );
}

export function getSiteUrl() {
  const configuredUrl = getConfiguredSiteUrl();
  const normalizedConfiguredUrl = configuredUrl
    ? normalizeBaseUrl(configuredUrl)
    : null;
  if (normalizedConfiguredUrl) return normalizedConfiguredUrl;

  if (isViteDev() || getProcessEnv("NODE_ENV") === "development") {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    const port = getProcessEnv("PORT") ?? "3000";
    return `http://localhost:${port}`;
  }

  return SiteConfig.prodUrl;
}

function cleanPath(path = "/") {
  if (path === "") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function toIsoDate(value: Date | string) {
  return new Date(value).toISOString();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function absoluteUrl(path = "/") {
  return new URL(cleanPath(path), getSiteUrl()).toString();
}

export function absoluteAssetUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  return absoluteUrl(url);
}

export function formatSeoTitle(title?: string) {
  if (!title) return SiteConfig.seo.defaultTitle;
  if (title === SiteConfig.title || title.includes(SiteConfig.title)) {
    return title;
  }
  return SiteConfig.seo.titleTemplate.replace("%s", title);
}

export function resolveSeoImage(image?: string | SeoImage | null): SeoImage {
  const fallback = SiteConfig.seo.defaultImage;
  const candidate =
    typeof image === "string" ? { url: image } : (image ?? fallback);

  return {
    width: fallback.width,
    height: fallback.height,
    alt: fallback.alt,
    ...candidate,
    url: absoluteAssetUrl(candidate.url),
  };
}

export function createOgImageUrl(input: {
  title?: string;
  description?: string;
  label?: string;
}) {
  const url = new URL("/og.png", getSiteUrl());
  url.searchParams.set("title", input.title ?? SiteConfig.title);
  url.searchParams.set(
    "description",
    input.description ?? SiteConfig.description,
  );
  url.searchParams.set("label", input.label ?? "SaaS");
  return url.toString();
}

export function createSeoHead(options: SeoOptions = {}) {
  const rawTitle = options.title ?? SiteConfig.seo.defaultTitle;
  const title = formatSeoTitle(rawTitle);
  const description = options.description ?? SiteConfig.description;
  const image = resolveSeoImage({
    url: createOgImageUrl({
      title: rawTitle,
      description,
      label:
        options.section ??
        (options.type === "article" ? "Article" : SiteConfig.title),
    }),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: `${rawTitle} - ${SiteConfig.title} social preview`,
    type: "image/png",
  });
  const url = options.path ? absoluteUrl(options.path) : getSiteUrl();
  const robots = options.noindex
    ? "noindex, follow, max-image-preview:large"
    : (options.robots ?? defaultRobots);
  const keywords = options.keywords?.filter(Boolean).join(", ");
  const tags = [...(options.tags ?? []), ...(options.keywords ?? [])].filter(
    Boolean,
  );
  const twitterSite = SiteConfig.team.twitter
    .replace("https://twitter.com/", "@")
    .replace("https://x.com/", "@");
  const jsonLd = Array.isArray(options.jsonLd)
    ? options.jsonLd
    : options.jsonLd
      ? [options.jsonLd]
      : [];

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    ...(keywords ? [{ name: "keywords", content: keywords }] : []),
    { property: "og:type", content: options.type ?? "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SiteConfig.title },
    { property: "og:locale", content: SiteConfig.locale },
    { property: "og:image", content: image.url },
    { property: "og:image:secure_url", content: image.url },
    { property: "og:image:width", content: String(image.width) },
    { property: "og:image:height", content: String(image.height) },
    { property: "og:image:alt", content: image.alt },
    ...(image.type ? [{ property: "og:image:type", content: image.type }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: twitterSite },
    { name: "twitter:creator", content: twitterSite },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image.url },
    { name: "twitter:image:alt", content: image.alt },
    ...(options.publishedTime
      ? [
          {
            property: "article:published_time",
            content: toIsoDate(options.publishedTime),
          },
        ]
      : []),
    ...(options.modifiedTime
      ? [
          {
            property: "article:modified_time",
            content: toIsoDate(options.modifiedTime),
          },
        ]
      : []),
    ...(options.section
      ? [{ property: "article:section", content: options.section }]
      : []),
    ...tags.map((tag) => ({ property: "article:tag", content: tag })),
    ...jsonLd.map((schema) => ({ "script:ld+json": schema })),
  ];

  return {
    meta: meta as JSX.IntrinsicElements["meta"][],
    links: (options.path && options.canonical !== false
      ? [{ rel: "canonical", href: url }]
      : []) as JSX.IntrinsicElements["link"][],
  };
}

export function createNoIndexHead({
  title,
  description,
  path,
  section,
}: NoIndexHeadOptions) {
  return createSeoHead({
    title,
    description,
    path,
    section,
    noindex: true,
    canonical: false,
  });
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SiteConfig.company.name,
    url: getSiteUrl(),
    logo: absoluteAssetUrl(SiteConfig.appIcon),
    description: SiteConfig.description,
    sameAs: [SiteConfig.team.website, SiteConfig.team.twitter],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SiteConfig.title,
    url: getSiteUrl(),
    description: SiteConfig.description,
    publisher: {
      "@type": "Organization",
      name: SiteConfig.company.name,
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SiteConfig.title,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: getSiteUrl(),
    image: resolveSeoImage().url,
    description: SiteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: SiteConfig.company.name,
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function articleJsonLd(input: {
  type?: "Article" | "BlogPosting";
  title: string;
  description: string;
  path: string;
  image?: string | SeoImage | null;
  datePublished?: Date | string;
  dateModified?: Date | string;
  keywords?: string[];
}) {
  const image = resolveSeoImage(input.image);
  const datePublished = input.datePublished
    ? toIsoDate(input.datePublished)
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "Article",
    headline: input.title,
    description: input.description,
    image: [image.url],
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(datePublished ? { datePublished } : {}),
    dateModified: input.dateModified
      ? toIsoDate(input.dateModified)
      : (datePublished ?? new Date().toISOString()),
    author: {
      "@type": "Person",
      name: SiteConfig.team.name,
      url: SiteConfig.team.website,
      sameAs: [SiteConfig.team.twitter],
    },
    publisher: {
      "@type": "Organization",
      name: SiteConfig.company.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteAssetUrl(SiteConfig.appIcon),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(input.path),
    },
  };
}

export function createSitemapXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const image = entry.image ? resolveSeoImage(entry.image) : null;
      return [
        "  <url>",
        `    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>`,
        entry.lastmod
          ? `    <lastmod>${escapeXml(toIsoDate(entry.lastmod))}</lastmod>`
          : "",
        entry.changefreq
          ? `    <changefreq>${entry.changefreq}</changefreq>`
          : "",
        entry.priority
          ? `    <priority>${entry.priority.toFixed(1)}</priority>`
          : "",
        image
          ? [
              "    <image:image>",
              `      <image:loc>${escapeXml(image.url)}</image:loc>`,
              image.alt
                ? `      <image:caption>${escapeXml(image.alt)}</image:caption>`
                : "",
              "    </image:image>",
            ]
              .filter(Boolean)
              .join("\n")
          : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urls,
    "</urlset>",
  ].join("\n");
}

export function createRssFeedXml(
  posts: {
    slug: string;
    attributes: {
      title: string;
      description: string;
      date: Date;
      coverUrl: string;
      tags?: string[];
    };
  }[],
) {
  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/posts/${post.slug}`);
      const image = resolveSeoImage(post.attributes.coverUrl);
      return [
        "    <item>",
        `      <title>${escapeXml(post.attributes.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid>${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.attributes.description)}</description>`,
        `      <pubDate>${new Date(post.attributes.date).toUTCString()}</pubDate>`,
        `      <enclosure url="${escapeXml(image.url)}" type="image/jpeg" />`,
        ...(post.attributes.tags ?? []).map(
          (tag) => `      <category>${escapeXml(tag)}</category>`,
        ),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(`${SiteConfig.title} Blog`)}</title>`,
    `    <link>${escapeXml(absoluteUrl("/posts"))}</link>`,
    `    <description>${escapeXml(SiteConfig.description)}</description>`,
    `    <language>en</language>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");
}
