import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { formatDate } from "@/lib/format/date";
import { articleJsonLd, breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getChangelogForPage = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { getCurrentChangelog } =
      await import("@/features/changelog/changelog-manager");
    return (await getCurrentChangelog(slug)) ?? null;
  });

const changelogSlugLoader = async (slug: string) => {
  return getChangelogForPage({ data: slug });
};

export const Route = createFileRoute("/(layout)/changelog/$slug/")({
  loader: async ({ params }) => {
    const changelog = await changelogSlugLoader(params.slug);
    if (!changelog) throw notFound();
    return changelog;
  },
  head: ({ loaderData }) => ({
    ...createSeoHead({
      title: loaderData?.attributes.title ?? "Changelog",
      description: loaderData
        ? `${SiteConfig.title} changelog entry from ${formatDate(loaderData.attributes.date)}${
            loaderData.attributes.version
              ? ` for version ${loaderData.attributes.version}`
              : ""
          }.`
        : `${SiteConfig.title} changelog entry.`,
      path: `/changelog/${loaderData?.slug ?? ""}`,
      type: "article",
      image: loaderData?.attributes.image,
      section: "Changelog",
      publishedTime: loaderData?.attributes.date,
      modifiedTime: loaderData?.attributes.date,
      jsonLd: loaderData
        ? [
            articleJsonLd({
              title:
                loaderData.attributes.title ??
                formatDate(loaderData.attributes.date),
              description: `${SiteConfig.title} changelog entry from ${formatDate(
                loaderData.attributes.date,
              )}.`,
              path: `/changelog/${loaderData.slug}`,
              image: loaderData.attributes.image,
              datePublished: loaderData.attributes.date,
              dateModified: loaderData.attributes.date,
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Changelog", path: "/changelog" },
              {
                name:
                  loaderData.attributes.title ??
                  formatDate(loaderData.attributes.date),
                path: `/changelog/${loaderData.slug}`,
              },
            ]),
          ]
        : undefined,
    }),
  }),
  component: ChangelogDetailPage,
  pendingComponent: ChangelogDetailPageSkeleton,
});

function ChangelogDetailPage() {
  const changelog = Route.useLoaderData();
  const { attributes, content } = changelog;
  const title = attributes.title ?? formatDate(attributes.date);

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <Link
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "mb-6",
        })}
        to="/changelog"
      >
        <ArrowLeft size={16} /> Back to Changelog
      </Link>

      {attributes.image && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl">
          <img
            src={attributes.image}
            alt={title}
            className="h-full w-full object-cover"
            width={1200}
            height={630}
            sizes="(max-width: 896px) 100vw, 896px"
            decoding="async"
          />
        </div>
      )}

      <header className="mb-8 border-b pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {attributes.version && (
            <Badge variant="default" className="gap-1">
              <Tag size={12} />v{attributes.version}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Calendar size={12} />
            {formatDate(attributes.date)}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
          {title}
        </h1>
      </header>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ServerMdx source={content} />
      </div>
    </article>
  );
}

function ChangelogDetailPageSkeleton() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-6 h-9 w-40 rounded-md" />
      <Skeleton className="mb-8 aspect-video w-full rounded-xl" />
      <header className="mb-8 flex flex-col gap-4 border-b pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>
        <Skeleton className="h-12 w-full max-w-2xl rounded-md" />
      </header>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-full rounded-md" />
        <Skeleton className="h-5 w-11/12 rounded-md" />
        <Skeleton className="h-5 w-4/5 rounded-md" />
        <Skeleton className="mt-4 h-8 w-64 rounded-md" />
        <Skeleton className="h-5 w-full rounded-md" />
        <Skeleton className="h-5 w-3/4 rounded-md" />
      </div>
    </article>
  );
}
