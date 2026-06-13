import { Skeleton } from "@/components/ui/skeleton";
import { OrgDetailsForm } from "./(details)/org-details-form";
import { createNoIndexHead } from "@/lib/seo";
import { useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/orgs/$orgSlug/(navigation)/settings/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Settings",
      description: `Manage ${SiteConfig.title} organization settings.`,
      path: `/orgs/${params.orgSlug}/settings`,
      section: "Orgs",
    }),
  component: OrgSettingsPage,
  pendingComponent: SettingsSkeleton,
});

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex items-start justify-between px-6">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="size-16 rounded-full" />
        </div>
        <div className="border-t pt-6">
          <div className="flex items-center justify-between px-6">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
      <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex flex-col gap-1.5 px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="px-6">
          <Skeleton className="h-10 w-80 rounded-md" />
        </div>
        <div className="border-t pt-6">
          <div className="flex items-center justify-between px-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgSettingsPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getFullOrganization, {
    organizationSlug: orgSlug,
  });

  if (org === undefined) return null;
  if (!org) return null;

  return (
    <OrgDetailsForm
      defaultValues={{
        name: org.name,
        logo: org.logo,
      }}
    />
  );
}
