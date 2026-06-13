import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { useSession } from "@/lib/auth-client";
import { AdminNavigation } from "./_navigation/admin-navigation";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/admin")({
  head: () =>
    createNoIndexHead({
      title: "Admin",
      description: `Private ${SiteConfig.title} platform administration area.`,
      path: "/admin",
      section: "Admin",
    }),
  component: AdminLayout,
  pendingComponent: AdminLayoutSkeleton,
});

function AdminLayout() {
  const session = useSession();

  if (session.isPending) return <AdminLayoutSkeleton />;
  if (session.data?.user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminNavigation>
      <Outlet />
    </AdminNavigation>
  );
}

function AdminLayoutSkeleton() {
  return (
    <AdminNavigation>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </AdminNavigation>
  );
}
