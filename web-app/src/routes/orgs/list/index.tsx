import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { CreateOrganizationLink } from "@/features/organization/create-organization-link";
import { OrgsPageShell } from "@/features/page/orgs-page-shell";
import { createNoIndexHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowRight, Building2, CreditCard, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/orgs/list/")({
  head: () =>
    createNoIndexHead({
      title: "Your Organizations",
      description: `Private ${SiteConfig.title} organization switcher.`,
      path: "/orgs/list",
      section: "Orgs",
    }),
  component: OrgsListPage,
  pendingComponent: OrgsListSkeleton,
});

type OrgListItem = NonNullable<
  ReturnType<
    typeof useQuery<typeof api.auth.queries.listOrganizationsWithRoles>
  >
>[number];

function OrgsListPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const orgs = useQuery(
    api.auth.queries.listOrganizationsWithRoles,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading) return <OrgsListSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" replace />;
  if (orgs === undefined) return <OrgsListSkeleton />;

  if (orgs.length === 0) {
    return (
      <OrgsPageShell>
        <Layout size="lg">
          <LayoutContent>
            <OrgsListEmptyState />
          </LayoutContent>
        </Layout>
      </OrgsPageShell>
    );
  }

  return (
    <OrgsPageShell>
      <Layout size="lg">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <LayoutHeader>
            <LayoutTitle>Your organizations</LayoutTitle>
            <Typography variant="muted">
              Pick a workspace to continue or create a new one.
            </Typography>
          </LayoutHeader>
          <LayoutActions>
            <Button asChild>
              <CreateOrganizationLink>
                <Plus className="size-4" />
                New organization
              </CreateOrganizationLink>
            </Button>
          </LayoutActions>
        </div>
        <LayoutContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <OrgListCard key={org.id} org={org} />
            ))}
          </div>
        </LayoutContent>
      </Layout>
    </OrgsPageShell>
  );
}

function OrgListCard({ org }: { org: OrgListItem }) {
  const initial = org.name.slice(0, 1).toUpperCase();

  return (
    <Link
      to="/orgs/$orgSlug"
      params={{ orgSlug: org.slug }}
      className="focus-visible:ring-ring/50 group block rounded-xl outline-none focus-visible:ring-2"
      data-testid={`org-card-${org.slug}`}
    >
      <Card className="hover:border-foreground/20 h-full transition-colors">
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initial}</AvatarFallback>
            {org.logo ? <AvatarImage src={org.logo} alt="" /> : null}
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CardTitle className="line-clamp-1">{org.name}</CardTitle>
            <CardDescription className="line-clamp-1 font-mono text-xs">
              /{org.slug}
            </CardDescription>
          </div>
          <ArrowRight className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </CardHeader>
        <CardContent>
          <span className="text-muted-foreground text-xs capitalize">
            {org.role}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function OrgsListEmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 py-12">
      <Empty className="bg-card/40 border px-6 py-12">
        <EmptyHeader>
          <EmptyMedia className="bg-muted text-foreground mb-4 flex size-16 items-center justify-center rounded-2xl">
            <Building2 className="size-8" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl">
            Create your first organization
          </EmptyTitle>
          <EmptyDescription>
            Organizations group your team, billing, and settings. You can be in
            as many as you like.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <CreateOrganizationLink>
              <Plus className="size-4" />
              Create organization
            </CreateOrganizationLink>
          </Button>
        </EmptyContent>
      </Empty>
      <ul className="grid w-full gap-3 sm:grid-cols-3">
        <EmptyFeature
          icon={Users}
          title="Invite teammates"
          description="Share access by role and email."
        />
        <EmptyFeature
          icon={CreditCard}
          title="Centralize billing"
          description="One plan, one invoice per workspace."
        />
        <EmptyFeature
          icon={Building2}
          title="Per-org settings"
          description="Logo, slug, and preferences."
        />
      </ul>
    </div>
  );
}

function EmptyFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <li className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <Icon className="text-muted-foreground size-4" />
      <span className="text-foreground text-sm font-medium">{title}</span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </li>
  );
}

function OrgsListSkeleton() {
  return (
    <OrgsPageShell>
      <Layout size="lg">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <LayoutHeader>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </LayoutHeader>
          <LayoutActions>
            <Skeleton className="h-9 w-44 rounded-md" />
          </LayoutActions>
        </div>
        <LayoutContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <OrgCardSkeleton key={index} />
            ))}
          </div>
        </LayoutContent>
      </Layout>
    </OrgsPageShell>
  );
}

function OrgCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-12" />
      </CardContent>
    </Card>
  );
}
