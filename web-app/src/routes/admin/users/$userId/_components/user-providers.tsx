import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation } from "convex/react";
import { Key, Mail, MoreHorizontal, Shield } from "lucide-react";

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

type Account = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessTokenExpiresAt: number | string | null;
  refreshTokenExpiresAt: number | string | null;
  scope: string | null;
  createdAt: number | string;
  updatedAt: number | string;
};

type UserProvidersProps = {
  accounts: Account[];
  userId: string;
};

const getProviderIcon = (providerId: string) => {
  switch (providerId.toLowerCase()) {
    case "github":
      return <Github className="size-4" />;
    case "google":
      return <Mail className="size-4" />;
    case "credential":
    case "credentials":
      return <Shield className="size-4" />;
    default:
      return <Shield className="size-4" />;
  }
};

const getProviderName = (providerId: string) => {
  switch (providerId.toLowerCase()) {
    case "github":
      return "GitHub";
    case "google":
      return "Google";
    case "credential":
    case "credentials":
      return "Email/Password";
    default:
      return providerId;
  }
};

const getStatus = (account: Account) => {
  if (
    account.accessTokenExpiresAt &&
    new Date(account.accessTokenExpiresAt) > new Date()
  )
    return "Active";
  return "Connected";
};

const getStatusVariant = (account: Account) => {
  if (
    account.accessTokenExpiresAt &&
    new Date(account.accessTokenExpiresAt) > new Date()
  )
    return "default" as const;
  return "secondary" as const;
};

export function UserProviders({ accounts, userId }: UserProvidersProps) {
  const setUserPassword = useConvexMutation(
    api.admin.mutations.setUserPassword,
  );
  const revokeUserSessions = useConvexMutation(
    api.admin.mutations.revokeUserSessions,
  );

  const setPasswordMutation = useQueryMutation({
    mutationFn: async (newPassword: string) => {
      return setUserPassword({ userId, newPassword });
    },
    onSuccess: () => {
      toast.success("Password updated");
    },
    onError: (error: Error) => {
      toastClientError(error, "Failed to set password");
    },
  });

  const revokeSessionsMutation = useQueryMutation({
    mutationFn: async () => {
      return revokeUserSessions({ userId });
    },
    onSuccess: () => {
      toast.success("All sessions revoked");
    },
    onError: (error: Error) => {
      toastClientError(error, "Failed to revoke sessions");
    },
  });

  if (accounts.length === 0) {
    return (
      <Card className="border-border/70 border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Providers (0)
          </CardTitle>
          <CardDescription>
            Connected authentication methods for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Shield />
              </EmptyMedia>
              <EmptyTitle>No authentication providers</EmptyTitle>
              <EmptyDescription>
                This user does not have any connected sign-in providers yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Providers ({accounts.length})
        </CardTitle>
        <CardDescription>
          Connected authentication methods for this user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-2">
          {accounts.map((account) => (
            <Item key={account.id} size="sm" variant="outline">
              <ItemMedia>
                <div className="bg-muted flex size-8 items-center justify-center rounded-md">
                  {getProviderIcon(account.providerId)}
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="gap-2">
                  {getProviderName(account.providerId)}
                  <Badge
                    variant={getStatusVariant(account)}
                    className="text-xs"
                  >
                    {getStatus(account)}
                  </Badge>
                </ItemTitle>
                <ItemDescription>
                  <code className="text-xs">{account.accountId}</code>
                  {" - "}
                  {new Date(account.createdAt).toLocaleDateString()}
                </ItemDescription>
              </ItemContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-7"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(account.providerId === "credential" ||
                    account.providerId === "credentials") && (
                    <DropdownMenuItem
                      onClick={() => {
                        dialogManager.input({
                          title: "Set Password",
                          input: {
                            label: "New Password",
                            defaultValue: "",
                          },
                          action: {
                            label: "Set Password",
                            onClick: async (value) => {
                              await setPasswordMutation.mutateAsync(
                                value ?? "",
                              );
                            },
                          },
                        });
                      }}
                    >
                      <Key className="mr-2 size-4" />
                      Set Password
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      dialogManager.confirm({
                        title: "Revoke All Sessions",
                        description:
                          "This will log the user out from all devices.",
                        action: {
                          label: "Revoke All",
                          onClick: async () => {
                            await revokeSessionsMutation.mutateAsync();
                          },
                        },
                      });
                    }}
                  >
                    <Shield className="mr-2 size-4" />
                    Revoke All Sessions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
