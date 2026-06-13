import { OrgLayoutSkeleton } from "./(navigation)/_navigation/org-layout-skeleton";
import { OrgProvider } from "@/features/organization/org-provider";
import { mapSubscription } from "@/lib/organizations/map-subscription";
import { createNoIndexHead } from "@/lib/seo";
import { useConvexAuth, useQuery } from "convex/react";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/orgs/$orgSlug")({
  head: () =>
    createNoIndexHead({
      title: "Organization Workspace",
      description: `Private ${SiteConfig.title} organization workspace.`,
      section: "Orgs",
    }),
  component: OrgLayout,
  pendingComponent: OrgLayoutSkeleton,
});

function OrgLayout() {
  const { orgSlug } = Route.useParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const isDefaultOrgRoute = orgSlug === "default";
  const organizations = useQuery(
    api.auth.queries.listOrganizations,
    isAuthenticated && isDefaultOrgRoute ? {} : "skip",
  );
  const org = useQuery(
    api.auth.queries.getFullOrganization,
    isAuthenticated && !isDefaultOrgRoute
      ? { organizationSlug: orgSlug }
      : "skip",
  );

  const subscription = useQuery(
    api.subscriptions.queries.getActiveByOrganization,
    isAuthenticated && org?.id ? { organizationId: org.id } : "skip",
  );

  if (isLoading) return <OrgLayoutSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" />;

  if (isDefaultOrgRoute) {
    if (organizations === undefined) return <OrgLayoutSkeleton />;

    if (organizations.length === 0) return <Navigate to="/orgs/new" />;

    const firstOrg = organizations[0];
    if (!firstOrg.slug) return <Navigate to="/orgs/new" />;

    return (
      <Navigate
        to="/orgs/$orgSlug"
        params={{ orgSlug: firstOrg.slug }}
        replace
      />
    );
  }

  if (org === undefined) return <OrgLayoutSkeleton />;
  if (org === null) return <Navigate to="/auth/signin" />;

  return (
    <>
      <OrgProvider
        org={{
          id: org.id,
          slug: org.slug,
          name: org.name,
          image: org.logo ?? null,
          subscription: subscription ? mapSubscription(subscription) : null,
        }}
      />
      <Outlet />
    </>
  );
}
