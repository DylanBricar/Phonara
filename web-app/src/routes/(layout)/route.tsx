import { BaseLayout } from "@/features/layout/base-layout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(layout)")({
  component: RouteLayout,
});

function RouteLayout() {
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
}
