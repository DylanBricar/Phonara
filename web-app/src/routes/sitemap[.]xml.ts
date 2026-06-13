import { createSitemapXml, type SitemapEntry } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";

const staticEntries: SitemapEntry[] = [
  {
    path: "/",
    changefreq: "weekly",
    priority: 1,
    image: "/images/screenshot.png",
  },
  { path: "/docs", changefreq: "weekly", priority: 0.8 },
  { path: "/posts", changefreq: "weekly", priority: 0.8 },
  { path: "/changelog", changefreq: "weekly", priority: 0.7 },
  { path: "/about", changefreq: "monthly", priority: 0.6 },
  { path: "/contact", changefreq: "monthly", priority: 0.5 },
  { path: "/legal/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/legal/terms", changefreq: "yearly", priority: 0.3 },
  { path: "/llms.txt", changefreq: "weekly", priority: 0.2 },
  { path: "/feed.xml", changefreq: "daily", priority: 0.2 },
];

async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const [{ getAllDocs }, { getPosts, getPostsTags }, { getChangelogs }] =
    await Promise.all([
      import("./(layout)/docs/doc-manager"),
      import("@/features/posts/post-manager"),
      import("@/features/changelog/changelog-manager"),
    ]);

  const [docs, posts, tags, changelogs] = await Promise.all([
    getAllDocs(),
    getPosts(),
    getPostsTags(),
    getChangelogs(),
  ]);

  return [
    ...staticEntries,
    ...docs.map((doc) => ({
      path: doc.url,
      changefreq: "monthly" as const,
      priority: 0.7,
      image: doc.attributes.coverUrl,
    })),
    ...posts.map((post) => ({
      path: `/posts/${post.slug}`,
      lastmod: post.attributes.date,
      changefreq: "monthly" as const,
      priority: 0.7,
      image: {
        url: post.attributes.coverUrl,
        alt: post.attributes.title,
      },
    })),
    ...tags.map((tag) => ({
      path: `/posts/categories/${encodeURIComponent(tag)}`,
      changefreq: "weekly" as const,
      priority: 0.5,
    })),
    ...changelogs.map((entry) => ({
      path: `/changelog/${entry.slug}`,
      lastmod: entry.attributes.date,
      changefreq: "monthly" as const,
      priority: 0.5,
      image: entry.attributes.image
        ? {
            url: entry.attributes.image,
            alt:
              entry.attributes.title ??
              `${SiteConfig.title} ${entry.attributes.version ?? "release"}`,
          }
        : undefined,
    })),
  ];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(createSitemapXml(await getSitemapEntries()), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
