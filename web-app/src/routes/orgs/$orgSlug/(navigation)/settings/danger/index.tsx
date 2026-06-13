import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { OrganizationDangerForm } from "./org-danger-form";
import { OrganizationDeleteDialog } from "./organization-delete-dialog";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/danger/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Danger Zone",
      description: `Manage destructive ${SiteConfig.title} organization settings.`,
      path: `/orgs/${params.orgSlug}/settings/danger`,
      section: "Orgs",
    }),
  component: DangerPage,
  pendingComponent: DangerSkeleton,
});

function DangerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex flex-col gap-1.5 px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="px-6">
          <Skeleton className="h-10 w-80 rounded-md" />
        </div>
        <div className="border-t pt-6">
          <div className="flex items-center justify-end px-6">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
      <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex flex-col gap-1.5 px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="border-t pt-6">
          <div className="flex items-center justify-end px-6">
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getCurrentOrganization, {
    organizationSlug: orgSlug,
  });

  if (!org) return null;

  return (
    <div className="flex flex-col gap-4">
      <OrganizationDangerForm defaultValues={{ slug: org.slug }} />
      <Card>
        <CardHeader>
          <CardTitle>Delete Organization</CardTitle>
          <CardDescription>
            Once you delete an organization, there is no going back. Please be
            certain.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <OrganizationDeleteDialog org={{ id: org.id, slug: org.slug }} />
        </CardFooter>
      </Card>
    </div>
  );
}
