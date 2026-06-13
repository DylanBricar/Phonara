import { Typography } from "@/components/nowts/typography";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { ArrowRightIcon } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  formatAllDocsMarkdown,
  markdownResponseHeaders,
  shouldServeMarkdown,
} from "./-agent-markdown";

const getDocsIndexData = createServerFn({ method: "GET" }).handler(async () => {
  const { getAllDocs } = await import("./doc-manager");
  const docs = await getAllDocs();
  return { docs };
});

const docsIndexLoader = async () => {
  return getDocsIndexData();
};

const docsSeoHead = createSeoHead({
  title: "Documentation",
  description: `Everything you need to know about using ${SiteConfig.title}, from setup to authentication, API routes, content, and deployment patterns.`,
  path: "/docs",
  keywords: [`${SiteConfig.title} documentation`, "SaaS starter documentation"],
  jsonLd: breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Documentation", path: "/docs" },
  ]),
});

export const Route = createFileRoute("/(layout)/docs/")({
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        if (!shouldServeMarkdown(request)) {
          return next();
        }

        const { getAllDocs } = await import("./doc-manager");
        const docs = await getAllDocs();
        return new Response(formatAllDocsMarkdown(docs), {
          headers: markdownResponseHeaders,
        });
      },
    },
  },
  loader: docsIndexLoader,
  head: () => docsSeoHead,
  component: DocsIndexPage,
});

function DocsIndexPage() {
  const { docs } = Route.useLoaderData();

  const sortedDocs = [...docs].sort((a, b) => {
    if (a.attributes.order !== undefined && b.attributes.order !== undefined) {
      return a.attributes.order - b.attributes.order;
    }
    return a.attributes.title.localeCompare(b.attributes.title);
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Typography
            variant="h1"
            className="text-4xl font-bold tracking-tight"
          >
            Documentation
          </Typography>
          <Typography variant="p" className="text-muted-foreground text-lg">
            Everything you need to know about using {SiteConfig.title}
          </Typography>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {sortedDocs.map((doc) => (
            <Card key={doc.slug} className="h-fit overflow-hidden">
              {doc.attributes.coverUrl && (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${doc.attributes.coverUrl})`,
                  }}
                />
              )}
              <CardHeader>
                <CardTitle>{doc.attributes.title}</CardTitle>
                <CardDescription>{doc.attributes.description}</CardDescription>
              </CardHeader>
              <CardFooter className="justify-end">
                <Link
                  to="/docs/$"
                  params={{ _splat: doc.slug }}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Read More <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
