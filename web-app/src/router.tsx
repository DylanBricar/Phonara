import { Page404 } from "@/features/page/page-404";
import { getClientErrorMessage } from "@/lib/errors/client-error-message";
import { buttonVariants } from "@/components/ui/button";
import { Typography } from "@/components/nowts/typography";
import { createRouter, Link } from "@tanstack/react-router";
import { ArrowLeft, LogIn, Lock, TriangleAlert } from "lucide-react";
import { ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error }: { error: Error }) {
  const errorMessage = getClientErrorMessage(
    error,
    "An unexpected error occurred. Please try again.",
  );
  const isUnauthorized = /unauthorized/i.test(errorMessage);

  if (isUnauthorized) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="bg-muted border-border flex size-16 items-center justify-center rounded-2xl border">
            <Lock className="size-7" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <Typography variant="h2">You need to be signed in</Typography>
            <Typography variant="muted" className="text-base">
              This page requires authentication. Please sign in to continue.
            </Typography>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth/signin"
              className={buttonVariants({ variant: "default" })}
            >
              <LogIn className="size-4" />
              Sign in
            </Link>
            <Link to="/" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <TriangleAlert className="size-7 text-red-500" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <Typography variant="h2">Something went wrong</Typography>
          <Typography variant="muted" className="text-base">
            {errorMessage}
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function getRouter() {
  const convexUrl = (
    import.meta as unknown as Record<string, Record<string, string>>
  ).env.VITE_CONVEX_URL;
  const convexClient = new ConvexReactClient(convexUrl);

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    unmaskOnReload: true,
    defaultNotFoundComponent: Page404,
    defaultErrorComponent: DefaultErrorComponent,
    defaultPendingComponent: () => null,
    defaultPendingMinMs: 0,
    context: { convexClient },
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
