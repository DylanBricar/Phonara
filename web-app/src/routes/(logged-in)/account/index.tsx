import {
  AvatarCard,
  EmailCard,
  NameCard,
  UserIdCard,
} from "./edit-profile-form";
import { AccountCardSkeleton } from "./_components/account-card-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/(logged-in)/account/")({
  head: () => ({
    meta: [
      { title: "Settings" },
      { name: "description", content: "Update your profile." },
    ],
  }),
  component: AccountSettingsPage,
  pendingComponent: AccountSettingsSkeleton,
});

function AccountSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton hasFooter={false} />
    </div>
  );
}

function AccountSettingsPage() {
  const session = useQuery(api.auth.queries.getSession, {});

  if (session === undefined) return <AccountSettingsSkeleton />;
  if (!session) return null;

  const user = session.user;

  return (
    <div className="flex flex-col gap-6">
      <AvatarCard user={user} />
      <NameCard user={user} />
      <EmailCard user={user} />
      <UserIdCard user={user} />
    </div>
  );
}
