import { Typography } from "@/components/nowts/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangelogTimeline } from "@/features/changelog/changelog-timeline";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { FileQuestion } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getChangelogsForPage = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getChangelogs } =
      await import("@/features/changelog/changelog-manager");
    return getChangelogs();
  },
);

const changelogLoader = async () => {
  const changelogs = await getChangelogsForPage();
  return { changelogs };
};

const changelogSeoHead = createSeoHead({
  title: "Changelog",
  description: `Follow ${SiteConfig.title} product updates, improvements, fixes, and release notes.`,
  path: "/changelog",
  jsonLd: breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Changelog", path: "/changelog" },
  ]),
});

type ChangelogSearch = {
  entry?: string;
};

export const Route = createFileRoute("/(layout)/changelog/")({
  validateSearch: (search: Record<string, unknown>): ChangelogSearch => ({
    entry:
      typeof search.entry === "string" && search.entry.length > 0
        ? search.entry
        : undefined,
  }),
  loader: changelogLoader,
  head: () => changelogSeoHead,
  component: ChangelogPage,
  pendingComponent: ChangelogPageSkeleton,
});

function ChangelogPage() {
  const { changelogs } = Route.useLoaderData();
  const { entry } = Route.useSearch();

  if (changelogs.length === 0) {
    return (
      <div className="px-6 py-16">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Changelog
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Stay up to date with the latest features and improvements.
          </p>
        </header>
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-xl border-2 border-dashed p-12">
          <FileQuestion className="text-muted-foreground mb-4 size-16" />
          <Typography variant="h3">No changelog entries yet</Typography>
          <Typography variant="muted" className="mt-2">
            Check back soon for updates.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-16">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Changelog
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Stay up to date with the latest features, improvements, and bug fixes.
        </p>
      </header>
      <ChangelogTimeline
        changelogs={changelogs}
        selectedSlug={entry}
        className="mx-auto max-w-2xl"
      />
    </div>
  );
}

function ChangelogPageSkeleton() {
  return (
    <div className="px-6 py-16">
      <header className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
        <Skeleton className="h-11 w-56 rounded-md" />
        <Skeleton className="h-6 w-full max-w-lg rounded-md" />
      </header>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-6">
            <div className="flex shrink-0 flex-col items-center">
              <Skeleton className="size-5 rounded-full md:size-6" />
              {index < 3 && <Skeleton className="mt-2 h-24 w-px" />}
            </div>
            <div className="flex flex-1 flex-col gap-3 pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24 rounded-md" />
                {index === 0 && <Skeleton className="h-5 w-14 rounded-md" />}
              </div>
              <div className="flex gap-4">
                <Skeleton className="size-16 shrink-0 rounded-lg md:size-20" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-56 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
