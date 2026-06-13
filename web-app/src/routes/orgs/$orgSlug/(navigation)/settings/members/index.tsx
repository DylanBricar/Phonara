import type { OrgMembers } from "@/query/org/get-orgs-members";
import {
  getPlanLimits,
  type OverrideLimits,
} from "@/lib/auth/stripe/auth-plans";
import { Skeleton } from "@/components/ui/skeleton";
import { createNoIndexHead } from "@/lib/seo";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { OrgMembersForm } from "./org-members-form";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/members/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Members",
      description: `Manage ${SiteConfig.title} organization members.`,
      path: `/orgs/${params.orgSlug}/settings/members`,
      section: "Orgs",
    }),
  component: MembersPage,
  pendingComponent: MembersSkeleton,
});

function MembersSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="flex flex-col gap-1.5 px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-2 px-6">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function MembersPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getCurrentOrganization, {
    organizationSlug: orgSlug,
  });

  if (org === undefined) return <MembersSkeleton />;
  if (!org) return <Navigate to="/orgs" />;

  const members: OrgMembers = org.members.map((member) => ({
    id: member.id,
    role: member.role,
    userId: member.userId,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image ?? undefined,
    },
  }));

  const invitations = org.invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    organizationId: invitation.organizationId,
    expiresAt: new Date(invitation.expiresAt),
    inviterId: invitation.inviterId,
    createdAt: new Date(invitation.createdAt),
  }));

  const limits = getPlanLimits(
    org.subscription?.plan,
    (org.subscription?.overrideLimits as OverrideLimits | null) ?? null,
  );

  return (
    <OrgMembersForm
      members={members}
      invitations={invitations}
      maxMembers={limits.members}
    />
  );
}
