import { Layout, LayoutContent } from "@/features/page/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { FeedbackTable } from "./_components/feedback-table";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/admin/feedback/")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
  }),
  head: () =>
    createNoIndexHead({
      title: "Feedback",
      description: `Review ${SiteConfig.title} platform feedback.`,
      path: "/admin/feedback",
      section: "Admin",
    }),
  component: AdminFeedbackPage,
  pendingComponent: FeedbackPageSkeleton,
});

function FeedbackPageSkeleton() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="size-9" />
          </div>
          <div className="rounded-lg border">
            <div className="flex items-center border-b px-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b px-4 py-3"
              >
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="ml-auto h-4 w-64" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-4" />
              </div>
            ))}
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}

function AdminFeedbackPage() {
  const { search } = Route.useSearch();

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
          <FeedbackTable search={search} />
        </div>
      </LayoutContent>
    </Layout>
  );
}
