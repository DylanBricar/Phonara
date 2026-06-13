import { DebugPanel } from "@/features/debug";
import { Page404 } from "@/features/page/page-404";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { CreateOrganizationDialog } from "@/features/organization/create-organization-dialog";
import { authClient } from "@/lib/auth-client";
import { createSeoHead, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Suspense } from "react";
import appCss from "@/globals.css?url";
import { Providers } from "@/-providers";

const rootSeoHead = createSeoHead({
  title: SiteConfig.seo.defaultTitle,
  canonical: false,
  jsonLd: [organizationJsonLd(), websiteJsonLd()],
});

type RouterContext = {
  convexClient: ConvexReactClient;
};

type RootSearch = {
  modal?: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: (search: Record<string, unknown>): RootSearch => ({
    modal: (search.modal as string) || undefined,
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...rootSeoHead.meta,
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
    ],
  }),
  component: RootLayout,
  notFoundComponent: Page404,
});

function RootLayout() {
  const { convexClient } = Route.useRouteContext();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        suppressHydrationWarning
        className={cn("bg-background h-full font-sans antialiased")}
      >
        <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
          <NuqsAdapter>
            <Providers>
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
              <SignInDialog />
              <CreateOrganizationDialog />
              {import.meta.env.DEV ? <DebugPanel /> : null}
            </Providers>
          </NuqsAdapter>
        </ConvexBetterAuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
