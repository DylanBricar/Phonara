import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import fm from "front-matter";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

type ContentAttributes = {
  status?: "draft" | "published";
  tags?: string[];
};

function readContentAttributes(filePath: string): ContentAttributes {
  try {
    return fm<ContentAttributes>(readFileSync(filePath, "utf8")).attributes;
  } catch {
    return {};
  }
}

function isProductionContentBuild() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

function getDocsPagePaths(): string[] {
  const root = join(process.cwd(), "content/docs");
  const paths = new Set<string>(["/docs"]);

  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, prefix ? `${prefix}/${entry.name}` : entry.name);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
      const fileName = entry.name.replace(/\.mdx$/, "");
      const slug =
        fileName === "index"
          ? prefix
          : prefix
            ? `${prefix}/${fileName}`
            : fileName;
      paths.add(slug ? `/docs/${slug}` : "/docs");
    }
  };

  try {
    walk(root, "");
  } catch {
    // content/docs missing — nothing to prerender
  }

  return Array.from(paths);
}

function getPostPagePaths(): string[] {
  const root = join(process.cwd(), "content/posts");
  const paths = new Set<string>(["/posts"]);

  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
      const full = join(root, entry.name);
      const attributes = readContentAttributes(full);
      if (isProductionContentBuild() && attributes.status === "draft") {
        continue;
      }

      const slug = entry.name.replace(/\.mdx$/, "");
      paths.add(`/posts/${slug}`);
      attributes.tags?.forEach((tag) => {
        paths.add(`/posts/categories/${encodeURIComponent(tag)}`);
      });
    }
  } catch {
    // content/posts missing — nothing to prerender
  }

  return Array.from(paths);
}

function getChangelogPagePaths(): string[] {
  const root = join(process.cwd(), "content/changelog");
  const paths = new Set<string>(["/changelog"]);

  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
      const full = join(root, entry.name);
      const attributes = readContentAttributes(full);
      if (isProductionContentBuild() && attributes.status === "draft") {
        continue;
      }

      paths.add(`/changelog/${entry.name.replace(/\.mdx$/, "")}`);
    }
  } catch {
    // content/changelog missing — nothing to prerender
  }

  return Array.from(paths);
}

const publicPagePaths = [
  "/",
  "/about",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/feed.xml",
  ...getDocsPagePaths(),
  ...getPostPagePaths(),
  ...getChangelogPagePaths(),
];

const publicPages = Array.from(new Set(publicPagePaths)).map((path) => ({
  path,
  prerender: { enabled: true },
}));

export default defineConfig({
  base: "/",
  server: { port: Number(process.env.PORT) || 3000 },
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ["@resvg/resvg-js"],
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
    external: [
      "stripe",
      "resend",
      "dotenv",
      "@aws-sdk/client-s3",
      "@resvg/resvg-js",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePrefix: "-",
        routeFileIgnorePattern:
          "\\.(action|schema|links)\\.ts|_components|_actions|_navigation|sign-in-|sign-up-|provider-button|credentials|doc-manager|post-slug|loading|error|not-found|global-error|account-sidebar|account-navigation|account\\.links|information-cards|subscribers-charts|client-org|donuts|users-chart|org-|billing-|cancel-form|card-skeleton|simple-pricing|plan-card|edit-billing|upcoming-invoice|payment-methods|billing-info|plan-usage|feedback-|organizations-list|link-stripe|organization-|user-details|user-growth|mrr-chart|admin-|users-list|user-actions|user-sessions|user-providers|edit-profile|mail-account|new-org|command-icons|upgrade-|orgs-select|sidebar-user|docs-api|docs-copy|docs-toc|docs-sidebar|unauthorized",
      },
      prerender: {
        enabled: true,
        autoSubfolderIndex: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        failOnError: false,
      },
      pages: publicPages,
    }),
    nitro({
      serverAssets: [
        { baseName: "docs", dir: "content/docs" },
        { baseName: "posts", dir: "content/posts" },
        { baseName: "changelog", dir: "content/changelog" },
      ],
    }),
    viteReact(),
  ],
});
