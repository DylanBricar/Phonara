import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutActions,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import InformationCards from "./information-cards";
import { SubscribersChart } from "./subscribers-charts";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/orgs/$orgSlug/(navigation)/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Dashboard",
      description: `Private ${SiteConfig.title} organization dashboard.`,
      path: `/orgs/${params.orgSlug}`,
      section: "Orgs",
    }),
  component: OrgDashboardPage,
  pendingComponent: DashboardSkeleton,
});

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-36" />
      <div className="flex flex-col gap-4 lg:gap-8">
        <div className="flex w-full items-start gap-4 max-lg:flex-col lg:gap-8">
          <Skeleton className="h-24 w-full flex-1 rounded-xl" />
          <Skeleton className="h-24 w-full flex-1 rounded-xl" />
          <Skeleton className="h-24 w-full flex-1 rounded-xl" />
          <Skeleton className="h-24 w-full flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    </div>
  );
}

function OrgDashboardPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getCurrentOrganization, {
    organizationSlug: orgSlug,
  });

  if (org === undefined) return <DashboardSkeleton />;

  const canInvite = org?.canInviteMember ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <LayoutHeader>
          <LayoutTitle>Dashboard</LayoutTitle>
        </LayoutHeader>
        <LayoutActions>
          {canInvite ? (
            <Link
              to="/orgs/$orgSlug/settings/members"
              params={{ orgSlug }}
              className={buttonVariants({ variant: "outline" })}
            >
              Invite member
            </Link>
          ) : null}
        </LayoutActions>
      </div>
      <div className="flex flex-col gap-4 lg:gap-8">
        <InformationCards />
        <SubscribersChart />
      </div>
    </div>
  );
}
