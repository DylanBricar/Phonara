import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AccountCardSkeleton } from "../_components/account-card-skeleton";
import { getProviderConfig } from "../_components/provider-config";

export const Route = createFileRoute("/(logged-in)/account/security/")({
  head: () => ({ meta: [{ title: "Security" }] }),
  pendingComponent: SecuritySkeleton,
  component: SecurityPageRoute,
});

function SecuritySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <AccountCardSkeleton contentLines={2} hasFooter={false} />
      <AccountCardSkeleton contentLines={0} hasContent={false} />
    </div>
  );
}

function SecurityPageRoute() {
  const accounts = useQuery(api.auth.queries.listUserAccounts, {});
  if (accounts === undefined) return <SecuritySkeleton />;
  return <SecurityPage accounts={accounts} />;
}

type Account = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  createdAt: Date;
};

type SecurityPageProps = {
  accounts: Account[];
};

function SecurityPage({ accounts }: SecurityPageProps) {
  const hasPassword = accounts.some(
    (acc) =>
      acc.providerId === "credential" || acc.providerId === "credentials",
  );

  const oauthProviders = accounts.filter(
    (acc) =>
      acc.providerId !== "credential" && acc.providerId !== "credentials",
  );

  const primaryProvider = oauthProviders.at(0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Authentication methods linked to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {accounts.map((account) => {
              const config = getProviderConfig(account.providerId);
              const Icon = config.icon;
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="bg-muted flex size-9 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="small">{config.name}</Typography>
                    <Typography variant="muted">
                      {config.description}
                    </Typography>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {hasPassword ? (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Your account is secured with a password.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              to="/account/change-password"
            >
              Change password
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Your account is managed by{" "}
              <strong>
                {getProviderConfig(primaryProvider?.providerId ?? "").name}
              </strong>
              . You can set a password to also sign in with email and password.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Link
              className={buttonVariants({ size: "sm" })}
              to="/account/security/new-password"
            >
              Create account password
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
