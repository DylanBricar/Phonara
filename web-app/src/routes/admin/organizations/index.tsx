import { Layout, LayoutContent } from "@/features/page/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { AdminOrganizationsPage } from "./_components/organizations-list-client";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/admin/organizations/")({
  validateSearch: z.object({
    q: z.string().optional().default(""),
    page: z.number().optional().default(1),
    plan: z.string().optional(),
    sort: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
  head: () =>
    createNoIndexHead({
      title: "Organizations",
      description: `Manage ${SiteConfig.title} platform organizations.`,
      path: "/admin/organizations",
      section: "Admin",
    }),
  component: OrgsPage,
  pendingComponent: OrgsPageSkeleton,
});

function OrgsPageSkeleton() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="size-9" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="rounded-lg border">
            <div className="flex flex-col">
              <div className="flex items-center border-b px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="ml-8 h-4 w-16" />
                <Skeleton className="ml-8 h-4 w-16" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b px-4 py-3"
                >
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="ml-auto h-5 w-14" />
                  <Skeleton className="ml-8 h-4 w-8" />
                  <Skeleton className="ml-8 h-4 w-28" />
                  <Skeleton className="ml-4 size-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}

function OrgsPage() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <AdminOrganizationsPage />
      </LayoutContent>
    </Layout>
  );
}
