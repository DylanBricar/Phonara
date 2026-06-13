import { OrgNavigation } from "./_navigation/org-navigation";
import { OrgLayoutSkeleton } from "./_navigation/org-layout-skeleton";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const getChangelogsForOrgNavigation = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getChangelogs } =
      await import("@/features/changelog/changelog-manager");
    return getChangelogs();
  },
);

const changelogLoader = async () => {
  const changelogs = await getChangelogsForOrgNavigation();
  return { changelogs };
};

export const Route = createFileRoute("/orgs/$orgSlug/(navigation)")({
  loader: changelogLoader,
  component: OrgNavigationLayout,
  pendingComponent: OrgLayoutSkeleton,
});

function OrgNavigationLayout() {
  const { orgSlug } = Route.useParams();
  const { changelogs } = Route.useLoaderData();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const org = useQuery(
    api.auth.queries.getCurrentOrganization,
    isAuthenticated ? { organizationSlug: orgSlug } : "skip",
  );
  const userOrganizations = useQuery(
    api.auth.queries.listOrganizations,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading) return <OrgLayoutSkeleton />;
  if (!isAuthenticated) return null;
  if (org === null) return null;

  return (
    <OrgNavigation
      slug={orgSlug}
      memberRoles={org?.memberRoles}
      userOrganizations={userOrganizations}
      changelogs={changelogs}
    >
      <Outlet />
    </OrgNavigation>
  );
}
