import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { OrgsPageShell } from "@/features/page/orgs-page-shell";
import { createNoIndexHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { NewOrganizationForm } from "./new-org-form";

export const Route = createFileRoute("/orgs/new/")({
  head: () =>
    createNoIndexHead({
      title: "Create Organization",
      description: `Create a private ${SiteConfig.title} organization.`,
      path: "/orgs/new",
      section: "Orgs",
    }),
  component: NewOrgPage,
  pendingComponent: NewOrgSkeleton,
});

function NewOrgSkeleton() {
  return (
    <OrgsPageShell>
      <Layout size="sm">
        <LayoutHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </LayoutHeader>
        <LayoutContent>
          <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
            <div className="flex flex-col gap-3 px-6">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="border-t pt-6">
              <div className="flex items-center justify-end px-6">
                <Skeleton className="h-9 w-40 rounded-md" />
              </div>
            </div>
          </div>
        </LayoutContent>
      </Layout>
    </OrgsPageShell>
  );
}

function NewOrgPage() {
  return (
    <OrgsPageShell>
      <Layout size="sm">
        <LayoutHeader>
          <LayoutTitle>Create a new organization</LayoutTitle>
          <LayoutDescription className="text-muted-foreground">
            Workspaces for your team, billing, and settings.
          </LayoutDescription>
        </LayoutHeader>
        <LayoutContent>
          <NewOrganizationForm />
        </LayoutContent>
      </Layout>
    </OrgsPageShell>
  );
}
