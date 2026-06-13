import { Loader } from "@/components/nowts/loader";
import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { SignUpCredentialsForm } from "./sign-up-credentials-form";

export const Route = createFileRoute("/auth/signup/")({
  validateSearch: z.object({
    callbackUrl: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Sign Up | ${SiteConfig.title}` },
      {
        name: "description",
        content: "Create your account to add AI chat widgets to your websites.",
      },
    ],
  }),
  component: AuthSignUpPage,
  pendingComponent: AuthSignUpSkeleton,
});

function AuthSignUpPage() {
  const session = useSession();
  const search = Route.useSearch();
  const callbackUrl = normalizeAuthCallbackUrl(search.callbackUrl);

  if (session.isPending) return <AuthSignUpSkeleton />;
  if (session.data?.user) return <Navigate to={callbackUrl} replace />;

  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-1">
        <Avatar className="mb-4 rounded-sm">
          <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
          <AvatarFallback>
            {SiteConfig.title.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <CardTitle>Sign up to {SiteConfig.title}</CardTitle>
        <CardDescription>
          We just need a few details to get you started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Loader />}>
          <SignUpCredentialsForm callbackUrl={callbackUrl} />
        </Suspense>

        <Typography variant="muted" className="mt-4 text-xs">
          You already have an account?{" "}
          <Link
            to="/auth/signin"
            search={{ callbackUrl }}
            className="dark:text-primary font-medium text-cyan-600 hover:underline"
          >
            Sign in
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}

function AuthSignUpSkeleton() {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-2">
        <Skeleton className="mb-4 size-10 rounded-sm" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}
