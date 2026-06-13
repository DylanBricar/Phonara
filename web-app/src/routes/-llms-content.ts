import { SiteConfig } from "@/site-config";

type UrlEntry = {
  url: string;
  title: string;
  description: string;
};

const publicPages: UrlEntry[] = [
  {
    url: "/",
    title: "Home",
    description: SiteConfig.description,
  },
  {
    url: "/docs",
    title: "Documentation",
    description:
      "Human documentation index. Non-browser clients receive all documentation as Markdown.",
  },
  {
    url: "/posts",
    title: "Blog",
    description: "Published articles and tutorials.",
  },
  {
    url: "/changelog",
    title: "Changelog",
    description: "Product updates, improvements, and release notes.",
  },
  {
    url: "/about",
    title: "About",
    description: `About ${SiteConfig.title}.`,
  },
  {
    url: "/contact",
    title: "Contact",
    description: "Support and contact page.",
  },
  {
    url: "/legal/privacy",
    title: "Privacy Policy",
    description: "Privacy policy and data handling information.",
  },
  {
    url: "/legal/terms",
    title: "Terms",
    description: "Terms of service.",
  },
];

const appRoutePatterns: UrlEntry[] = [
  {
    url: "/auth/signin",
    title: "Sign in",
    description: "User authentication entry point.",
  },
  {
    url: "/auth/signup",
    title: "Sign up",
    description: "New user registration entry point.",
  },
  {
    url: "/orgs",
    title: "Current organization redirect",
    description: "Redirects authenticated users to their active organization.",
  },
  {
    url: "/orgs/list",
    title: "Organization list",
    description: "Lists organizations available to the authenticated user.",
  },
  {
    url: "/orgs/new",
    title: "New organization",
    description: "Creates a new organization.",
  },
  {
    url: "/orgs/:orgSlug",
    title: "Organization dashboard",
    description: "Authenticated organization workspace.",
  },
  {
    url: "/orgs/:orgSlug/settings",
    title: "Organization settings",
    description: "Organization profile, members, billing, and danger settings.",
  },
  {
    url: "/account",
    title: "Account settings",
    description: "Authenticated user account settings.",
  },
  {
    url: "/admin",
    title: "Admin",
    description: "Platform admin area.",
  },
];

function absoluteUrl(path: string): string {
  return new URL(path, SiteConfig.prodUrl).toString();
}

function formatEntries(entries: UrlEntry[]): string {
  return entries
    .map(
      (entry) =>
        `- [${entry.title}](${absoluteUrl(entry.url)}) - ${entry.description}`,
    )
    .join("\n");
}

function formatDate(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export async function generateLlmsTxt(): Promise<string> {
  const [
    { getAllDocs },
    { getPosts, getPostsTags },
    { getChangelogs },
  ] = await Promise.all([
    import("./(layout)/docs/doc-manager"),
    import("@/features/posts/post-manager"),
    import("@/features/changelog/changelog-manager"),
  ]);

  const [docs, posts, postTags, changelogs] = await Promise.all([
    getAllDocs(),
    getPosts(),
    getPostsTags(),
    getChangelogs(),
  ]);

  const docEntries = docs.map((doc) => ({
    url: doc.slug ? `/docs/${doc.slug}` : "/docs",
    title: doc.attributes.title,
    description: doc.attributes.description,
  }));

  const postEntries = posts.map((post) => ({
    url: `/posts/${post.slug}`,
    title: post.attributes.title,
    description: `${post.attributes.description} Published ${formatDate(
      post.attributes.date,
    )}.`,
  }));

  const postCategoryEntries = postTags.map((tag) => ({
    url: `/posts/categories/${encodeURIComponent(tag)}`,
    title: `Blog category: ${tag}`,
    description: `Articles tagged ${tag}.`,
  }));

  const changelogEntries = changelogs.map((entry) => ({
    url: `/changelog/${entry.slug}`,
    title: entry.attributes.title ?? formatDate(entry.attributes.date),
    description: `Changelog entry from ${formatDate(entry.attributes.date)}${
      entry.attributes.version ? ` for version ${entry.attributes.version}` : ""
    }.`,
  }));

  return [
    `# ${SiteConfig.title}`,
    SiteConfig.description,
    `Base URL: ${SiteConfig.prodUrl}`,
    "",
    "## LLM Entry Points",
    `- [llms.txt](${absoluteUrl("/llms.txt")}) - This URL map for AI agents.`,
    `- [All documentation as Markdown](${absoluteUrl(
      "/docs",
    )}) - Fetch with curl, HTTPie, SDK clients, or Accept: text/markdown.`,
    `- [Single documentation page as Markdown](${absoluteUrl(
      "/docs/getting-started",
    )}) - Replace the slug with any documentation slug below.`,
    "",
    "## Public Pages",
    formatEntries(publicPages),
    "",
    "## Documentation",
    formatEntries(docEntries),
    "",
    "## Blog Content",
    formatEntries([...postEntries, ...postCategoryEntries]),
    "",
    "## Changelog Content",
    formatEntries(changelogEntries),
    "",
    "## Authenticated Application Route Patterns",
    formatEntries(appRoutePatterns),
    "",
    "## Notes For Agents",
    "- Browser requests receive HTML for human use.",
    "- Non-browser documentation requests receive Markdown optimized for agent ingestion.",
    "- Dynamic authenticated routes require a valid session and real organization slug.",
  ].join("\n");
}
