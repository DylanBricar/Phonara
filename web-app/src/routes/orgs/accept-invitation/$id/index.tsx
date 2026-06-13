import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/nowts/typography";
import { useSession } from "@/lib/auth-client";
import { createNoIndexHead } from "@/lib/seo";
import { api } from "@convex/_generated/api";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import {
  Link,
  Navigate,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Check, Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { SignInProviders } from "../../../auth/signin/sign-in-providers";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/orgs/accept-invitation/$id/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Organization Invitation",
      description: `Private ${SiteConfig.title} organization invitation.`,
      path: `/orgs/accept-invitation/${params.id}`,
      section: "Orgs",
    }),
  component: AcceptInvitationPage,
  pendingComponent: AcceptInvitationSkeleton,
});

function AcceptInvitationSkeleton() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Skeleton className="size-16 rounded-2xl" />
          <Skeleton className="mt-4 h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    </main>
  );
}

function AcceptInvitationPage() {
  const params = Route.useParams();
  const session = useSession();
  const [now] = useState(() => Date.now());
  const invitation = useConvexQuery(api.auth.queries.getInvitationDetails, {
    invitationId: params.id,
  });

  if (session.isPending || invitation === undefined) {
    return <AcceptInvitationSkeleton />;
  }

  if (!invitation) return <InvalidInvitation />;

  const isAuthenticated = Boolean(session.data?.user);
  const currentUserEmail = session.data?.user.email ?? null;
  const isExpired = invitation.expiresAt < now;

  if (invitation.status !== "pending") {
    return (
      <InvitationStateNotice
        title={
          invitation.status === "accepted"
            ? "Invitation already accepted"
            : invitation.status === "rejected"
              ? "Invitation declined"
              : "Invitation no longer valid"
        }
        description={
          invitation.status === "accepted"
            ? "You've already joined this organization."
            : "This invitation can no longer be used."
        }
        orgSlug={invitation.organization?.slug ?? null}
      />
    );
  }

  if (isExpired) {
    return (
      <InvitationStateNotice
        title="Invitation expired"
        description="Ask the inviter to send you a fresh invitation."
        orgSlug={null}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInToAccept
        invitationId={params.id}
        invitationEmail={invitation.email}
        organization={invitation.organization}
        inviterName={invitation.inviter?.name ?? null}
        role={invitation.role}
      />
    );
  }

  if (
    currentUserEmail &&
    currentUserEmail.toLowerCase() !== invitation.email.toLowerCase()
  ) {
    return (
      <WrongAccountNotice
        currentEmail={currentUserEmail}
        invitedEmail={invitation.email}
      />
    );
  }

  return (
    <AcceptInvitationCard
      invitationId={params.id}
      organization={invitation.organization}
      inviterName={invitation.inviter?.name ?? null}
      role={invitation.role}
    />
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function OrgAvatar(props: {
  name: string;
  logo: string | null | undefined;
  size?: "md" | "lg";
}) {
  const sizeClass = props.size === "lg" ? "size-16" : "size-12";
  return (
    <Avatar className={sizeClass}>
      {props.logo ? <AvatarImage src={props.logo} alt={props.name} /> : null}
      <AvatarFallback className="text-lg font-semibold">
        {props.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

type InvitationOrg = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
} | null;

function SignInToAccept(props: {
  invitationId: string;
  invitationEmail: string;
  organization: InvitationOrg;
  inviterName: string | null;
  role: string;
}) {
  const providers = useConvexQuery(
    api.auth.queries.getAvailableSocialProviders,
    {},
  );

  return (
    <PageShell>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          {props.organization ? (
            <OrgAvatar
              name={props.organization.name}
              logo={props.organization.logo}
              size="lg"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">You've been invited</CardTitle>
            <CardDescription>
              {props.inviterName ? (
                <>
                  <span className="text-foreground font-medium">
                    {props.inviterName}
                  </span>{" "}
                  invited you to join{" "}
                </>
              ) : (
                <>You've been invited to join </>
              )}
              <span className="text-foreground font-medium">
                {props.organization?.name ?? "this organization"}
              </span>{" "}
              as{" "}
              <span className="text-foreground font-medium">{props.role}</span>.
            </CardDescription>
          </div>
          <div className="bg-muted text-muted-foreground inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
            <Mail className="size-3.5" />
            {props.invitationEmail}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-border flex flex-col gap-4 border-t pt-6">
            <Typography variant="muted" className="text-center text-sm">
              Sign in with{" "}
              <span className="text-foreground font-medium">
                {props.invitationEmail}
              </span>{" "}
              to accept the invitation.
            </Typography>
            <SignInProviders
              providers={providers ?? []}
              callbackUrl={`/orgs/accept-invitation/${props.invitationId}`}
              email={props.invitationEmail}
            />
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function AcceptInvitationCard(props: {
  invitationId: string;
  organization: InvitationOrg;
  inviterName: string | null;
  role: string;
}) {
  const navigate = useNavigate();

  const acceptMutation = useQueryMutation({
    mutationFn: useConvexMutation(api.auth.mutations.acceptInvitation),
    onSuccess: (result) => {
      toast.success(`Welcome to ${props.organization?.name ?? "the team"}!`);
      const slug =
        (result as { organizationSlug: string | null }).organizationSlug ??
        props.organization?.slug ??
        null;
      if (slug) {
        void navigate({ to: "/orgs/$orgSlug", params: { orgSlug: slug } });
      } else {
        void navigate({ to: "/orgs" });
      }
    },
    onError: (error) => {
      toastClientError(error, "Failed to accept invitation");
    },
  });

  const rejectMutation = useQueryMutation({
    mutationFn: useConvexMutation(api.auth.mutations.rejectInvitation),
    onSuccess: () => {
      toast.success("Invitation declined");
      void navigate({ to: "/" });
    },
    onError: (error) => {
      toastClientError(error, "Failed to decline invitation");
    },
  });

  return (
    <PageShell>
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          {props.organization ? (
            <OrgAvatar
              name={props.organization.name}
              logo={props.organization.logo}
              size="lg"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">
              Join {props.organization?.name ?? "this organization"}
            </CardTitle>
            <CardDescription>
              {props.inviterName ? (
                <>
                  <span className="text-foreground font-medium">
                    {props.inviterName}
                  </span>{" "}
                  invited you as{" "}
                </>
              ) : (
                <>You've been invited as </>
              )}
              <span className="text-foreground font-medium">{props.role}</span>.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() =>
              acceptMutation.mutate({ invitationId: props.invitationId })
            }
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            size="lg"
            className="w-full"
          >
            <Check className="size-4" />
            {acceptMutation.isPending ? "Accepting..." : "Accept invitation"}
          </Button>
          <Button
            onClick={() =>
              rejectMutation.mutate({ invitationId: props.invitationId })
            }
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <X className="size-4" />
            Decline
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function InvalidInvitation() {
  return (
    <PageShell>
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted border-border flex size-16 items-center justify-center rounded-2xl border">
            <AlertTriangle className="size-7" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-2xl">Invitation not found</CardTitle>
          <CardDescription>
            This invitation link is invalid or has been revoked. Ask the inviter
            to send a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/" className="w-full">
            <Button variant="outline" className="w-full" size="lg">
              Back to home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </PageShell>
  );
}

function InvitationStateNotice(props: {
  title: string;
  description: string;
  orgSlug: string | null;
}) {
  if (props.orgSlug && props.title === "Invitation already accepted") {
    return <Navigate to="/orgs/$orgSlug" params={{ orgSlug: props.orgSlug }} />;
  }
  return (
    <PageShell>
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted border-border flex size-16 items-center justify-center rounded-2xl border">
            <AlertTriangle className="size-7" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-2xl">{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/" className="w-full">
            <Button variant="outline" className="w-full" size="lg">
              Back to home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </PageShell>
  );
}

function WrongAccountNotice(props: {
  currentEmail: string;
  invitedEmail: string;
}) {
  return (
    <PageShell>
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted border-border flex size-16 items-center justify-center rounded-2xl border">
            <AlertTriangle className="size-7" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-2xl">Wrong account</CardTitle>
          <CardDescription>
            This invitation was sent to{" "}
            <span className="text-foreground font-medium">
              {props.invitedEmail}
            </span>
            , but you're signed in as{" "}
            <span className="text-foreground font-medium">
              {props.currentEmail}
            </span>
            . Sign out and sign in with the invited email to accept.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/" className="w-full">
            <Button variant="outline" className="w-full" size="lg">
              Back to home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
