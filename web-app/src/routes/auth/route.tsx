import GridBackground from "@/components/nowts/grid-background";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteConfig } from "@/site-config";

const SQUARE_SIZE = 20;
const SQUARE_COLOR = "color-mix(in srgb, var(--muted) 50%, transparent)";

export const Route = createFileRoute("/auth")({
  head: () =>
    createNoIndexHead({
      title: "Authentication",
      description: `Sign in or create a ${SiteConfig.title} account.`,
      path: "/auth",
    }),
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <GridBackground color={SQUARE_COLOR} size={SQUARE_SIZE} />
      <Outlet />
    </div>
  );
}
