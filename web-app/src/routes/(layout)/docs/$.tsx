import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { articleJsonLd, breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DocsTableOfContents, type TocItem } from "./_components/docs-toc";
import { DocsCopyPage } from "./_components/docs-copy-page";
import { DocsApiExamples } from "./_components/docs-api-examples";
import {
  formatDocMarkdown,
  markdownResponseHeaders,
  shouldServeMarkdown,
} from "./-agent-markdown";

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const depth = match[1].length;
    const title = match[2].trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({
      title,
      url: `#${slug}`,
      depth,
    });
  }

  return toc;
}

const SHIKI_LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  curl: "bash",
};

const SUPPORTED_SHIKI_LANGS = new Set([
  "bash",
  "javascript",
  "typescript",
  "python",
  "json",
  "html",
  "css",
  "tsx",
  "jsx",
]);

async function highlightCodeMap(
  source: Record<string, string> | undefined,
  forcedLang?: string,
): Promise<Record<string, string> | undefined> {
  if (!source) return undefined;

  const { codeToHtml } = await import("shiki");
  const entries = await Promise.all(
    Object.entries(source).map(async ([key, code]) => {
      const candidate =
        forcedLang ??
        (key in SHIKI_LANG_ALIASES ? SHIKI_LANG_ALIASES[key] : key);
      const lang = SUPPORTED_SHIKI_LANGS.has(candidate) ? candidate : "text";
      const html = await codeToHtml(code.trim(), {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
      });
      return [key, html] as [string, string];
    }),
  );

  return Object.fromEntries(entries);
}

async function highlightMarkdownCodeBlocks(content: string): Promise<string> {
  const fenceRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  const matches: {
    index: number;
    length: number;
    lang: string;
    code: string;
  }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(content)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      lang: m[1] || "text",
      code: m[2],
    });
  }
  if (matches.length === 0) return content;

  const { codeToHtml } = await import("shiki");
  const replacements = await Promise.all(
    matches.map(async ({ lang, code }) => {
      const aliased =
        lang in SHIKI_LANG_ALIASES ? SHIKI_LANG_ALIASES[lang] : lang;
      const finalLang = SUPPORTED_SHIKI_LANGS.has(aliased) ? aliased : "text";
      return codeToHtml(code.replace(/\n$/, ""), {
        lang: finalLang,
        themes: { light: "github-light", dark: "github-dark" },
      });
    }),
  );

  let result = "";
  let cursor = 0;
  matches.forEach((match, i) => {
    result += content.slice(cursor, match.index);
    result += `\n\n<div class="docs-shiki not-typography">${replacements[i]}</div>\n\n`;
    cursor = match.index + match.length;
  });
  result += content.slice(cursor);
  return result;
}

const docsPageLoader = async (slug: string | undefined) => {
  const { getCurrentDoc, getAllDocs } = await import("./doc-manager");
  const [doc, allDocs] = await Promise.all([
    getCurrentDoc(slug ? slug.split("/") : []),
    getAllDocs(),
  ]);
  if (!doc) return null;

  const currentIndex = allDocs.findIndex((d) => d.slug === doc.slug);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc =
    currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  const toc = extractToc(doc.content);

  const [highlightedContent, highlightedExamples, highlightedResults] =
    await Promise.all([
      highlightMarkdownCodeBlocks(doc.content),
      highlightCodeMap(doc.attributes.examples),
      highlightCodeMap(doc.attributes.results, "json"),
    ]);

  return {
    doc,
    renderedContent: highlightedContent,
    prevDoc,
    nextDoc,
    toc,
    highlightedExamples,
    highlightedResults,
  };
};

const getDocsPageData = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => docsPageLoader(slug || undefined));

export const Route = createFileRoute("/(layout)/docs/$")({
  server: {
    handlers: {
      GET: async ({ request, params, next }) => {
        if (!shouldServeMarkdown(request)) {
          return next();
        }

        const { getCurrentDoc } = await import("./doc-manager");
        const doc = await getCurrentDoc(
          params._splat ? params._splat.split("/") : [],
        );

        if (!doc) {
          return new Response("Documentation page not found\n", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        return new Response(formatDocMarkdown(doc), {
          headers: markdownResponseHeaders,
        });
      },
    },
  },
  loader: async ({ params }) => {
    const data = await getDocsPageData({ data: params._splat ?? "" });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    ...createSeoHead({
      title: loaderData?.doc.attributes.title ?? "Documentation",
      description: loaderData?.doc.attributes.description,
      path: loaderData?.doc.url ?? "/docs",
      type: "article",
      image: loaderData?.doc.attributes.coverUrl,
      keywords: loaderData?.doc.attributes.keywords,
      tags: loaderData?.doc.attributes.tags,
      section: "Documentation",
      jsonLd: loaderData?.doc
        ? [
            articleJsonLd({
              title: loaderData.doc.attributes.title,
              description: loaderData.doc.attributes.description,
              path: loaderData.doc.url,
              image: loaderData.doc.attributes.coverUrl,
              keywords: loaderData.doc.attributes.keywords,
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Documentation", path: "/docs" },
              {
                name: loaderData.doc.attributes.title,
                path: loaderData.doc.url,
              },
            ]),
          ]
        : undefined,
    }),
  }),
  component: DocsPage,
});

function DocsPage() {
  const {
    doc,
    renderedContent,
    prevDoc,
    nextDoc,
    toc,
    highlightedExamples,
    highlightedResults,
  } = Route.useLoaderData();

  const method = doc.attributes.method as
    | "GET"
    | "POST"
    | "PATCH"
    | "DELETE"
    | "PUT"
    | undefined;
  const { endpoint, examples, results } = doc.attributes;
  const hasApiExamples = method ?? endpoint ?? examples ?? results;
  const pageUrl = `${SiteConfig.prodUrl}/docs/${doc.slug}`;

  return (
    <div className={cn("flex w-full")}>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-8">
                <Typography
                  variant="h1"
                  className="text-4xl font-bold tracking-tight"
                >
                  {doc.attributes.title}
                </Typography>
                <DocsCopyPage page={doc.content} url={pageUrl} />
              </div>
              {doc.attributes.description && (
                <Typography
                  variant="p"
                  className="text-muted-foreground text-lg"
                >
                  {doc.attributes.description}
                </Typography>
              )}
            </div>

            <ServerMdx source={renderedContent} className="w-full max-w-none" />

            <div className="border-border flex items-center justify-between border-t pt-6">
              {prevDoc ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/docs/$" params={{ _splat: prevDoc.slug }}>
                    <ArrowLeft className="size-4" />
                    {prevDoc.attributes.title}
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              {nextDoc ? (
                <Button variant="outline" size="sm" className="ml-auto" asChild>
                  <Link to="/docs/$" params={{ _splat: nextDoc.slug }}>
                    {nextDoc.attributes.title}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>

      {hasApiExamples && (
        <div className="w-full max-w-96 border-l max-2xl:hidden">
          <aside className="bg-background sticky top-14 h-fit max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="p-6">
              <DocsApiExamples
                method={method}
                endpoint={endpoint}
                examples={examples}
                results={results}
                highlightedExamples={highlightedExamples}
                highlightedResults={highlightedResults}
              />
            </div>
          </aside>
        </div>
      )}

      {toc.length > 0 && (
        <div className="w-full max-w-64 border-l max-2xl:hidden">
          <aside className="bg-background sticky top-14 h-fit max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="p-6">
              <DocsTableOfContents toc={toc} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
