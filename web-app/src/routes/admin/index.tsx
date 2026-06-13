import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout, LayoutContent } from "@/features/page/layout";
import { createNoIndexHead } from "@/lib/seo";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Building2, Crown, DollarSign, Users } from "lucide-react";
import { AdminChartsSkeleton } from "./_components/admin-charts-skeleton";
import { AdminStatsSkeleton } from "./_components/admin-stats-skeleton";
import { MrrChart } from "./_components/mrr-chart";
import { UserGrowthChart } from "./_components/user-growth-chart";
import { SiteConfig } from "@/site-config";

function AdminDashboardSkeleton() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminStatsSkeleton />
          <AdminChartsSkeleton />
        </div>
      </LayoutContent>
    </Layout>
  );
}

export const Route = createFileRoute("/admin/")({
  head: () =>
    createNoIndexHead({
      title: "Admin Dashboard",
      description: `Private ${SiteConfig.title} platform administration dashboard.`,
      path: "/admin",
      section: "Admin",
    }),
  component: AdminPage,
  pendingComponent: AdminDashboardSkeleton,
});

function AdminPage() {
  const dashboard = useQuery(api.admin.queries.getDashboard, {});

  if (dashboard === undefined) return <AdminDashboardSkeleton />;

  const mrrFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dashboard.mrrInCents / 100);

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Total Organizations",
                value: dashboard.totalOrgs.toLocaleString(),
                description: "Active organizations",
                icon: Building2,
              },
              {
                title: "Total Users",
                value: dashboard.totalUsers.toLocaleString(),
                description: "Registered users",
                icon: Users,
              },
              {
                title: "Premium Organizations",
                value: dashboard.premiumOrgs.toLocaleString(),
                description: "Paid plan subscriptions",
                icon: Crown,
              },
              {
                title: "Monthly Recurring Revenue",
                value: mrrFormatted,
                description: "Active subscriptions",
                icon: DollarSign,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-muted-foreground text-xs font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-muted-foreground text-xs">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <MrrChart data={dashboard.mrrHistory} />
            <UserGrowthChart data={dashboard.userGrowth} />
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}
