import { createNoIndexHead } from "@/lib/seo";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { OrgLayoutSkeleton } from "./$orgSlug/(navigation)/_navigation/org-layout-skeleton";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/orgs/")({
  head: () =>
    createNoIndexHead({
      title: "Organizations",
      description: `Private ${SiteConfig.title} organization redirect.`,
      path: "/orgs",
      section: "Orgs",
    }),
  component: OrgsRedirectPage,
  pendingComponent: OrgLayoutSkeleton,
});

function OrgsRedirectPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const orgs = useQuery(
    api.auth.queries.listOrganizations,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading) return <OrgLayoutSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" replace />;
  if (orgs === undefined) return <OrgLayoutSkeleton />;

  const firstOrg = Array.isArray(orgs) ? orgs[0] : null;
  if (!firstOrg?.slug) return <Navigate to="/orgs/new" replace />;

  return (
    <Navigate to="/orgs/$orgSlug" params={{ orgSlug: firstOrg.slug }} replace />
  );
}
