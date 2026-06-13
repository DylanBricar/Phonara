import { AppLogoMark } from "@/components/nowts/app-logo-mark";
import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { z } from "zod";
import { SignInProviders } from "./sign-in-providers";

export const Route = createFileRoute("/auth/signin/")({
  validateSearch: z.object({
    callbackUrl: z.string().optional(),
    email: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Sign In | ${SiteConfig.title}` },
      {
        name: "description",
        content: `Sign in to manage your ${SiteConfig.title} organizations, billing, and admin workspace.`,
      },
    ],
  }),
  component: AuthSignInPage,
  pendingComponent: AuthSignInSkeleton,
});

function AuthSignInSkeleton() {
  return (
    <Card className="mx-auto h-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-2">
        <div className="mx-auto mt-4 flex flex-row items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="mt-4">
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="mx-auto h-3 w-24" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-px flex-1" />
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="mx-auto h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

function AuthSignInPage() {
  const session = useSession();
  const search = Route.useSearch();
  const callbackUrl = normalizeAuthCallbackUrl(search.callbackUrl);
  const providers = useQuery(api.auth.queries.getAvailableSocialProviders, {});

  if (session.isPending || providers === undefined)
    return <AuthSignInSkeleton />;
  if (session.data?.user) return <Navigate to={callbackUrl} replace />;

  return (
    <Card className="mx-auto h-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-2">
        <div className="mx-auto mt-4 flex flex-row items-center gap-2">
          <AppLogoMark />
          <Typography variant="large">{SiteConfig.title}</Typography>
        </div>

        <CardDescription className="text-center">
          Sign in to manage your website chats.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        <SignInProviders
          providers={providers}
          callbackUrl={callbackUrl}
          email={search.email}
        />
      </CardContent>
    </Card>
  );
}
