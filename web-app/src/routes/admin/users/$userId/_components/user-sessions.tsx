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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { api } from "@convex/_generated/api";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import {
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

type UserSessionsProps = {
  userId: string;
};

type SessionStatus = "active" | "expired";

type SessionRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  impersonatedBy: string | null;
  createdAt: number;
  expiresAt: number;
};

const getSessionStatus = (
  session: Pick<SessionRow, "expiresAt">,
  now: number,
): SessionStatus => {
  return session.expiresAt > now ? "active" : "expired";
};

const getSessionStatusRank = (
  session: Pick<SessionRow, "expiresAt">,
  now: number,
) => {
  return getSessionStatus(session, now) === "active" ? 0 : 1;
};

export function UserSessions({ userId }: UserSessionsProps) {
  const sessionsData = useConvexQuery(api.admin.queries.listUserSessions, {
    userId,
  });
  const revokeUserSession = useConvexMutation(
    api.admin.mutations.revokeUserSession,
  );
  const revokeUserSessions = useConvexMutation(
    api.admin.mutations.revokeUserSessions,
  );

  const isLoading = sessionsData === undefined;
  const [now] = useState(() => Date.now());
  const sessions = [...((sessionsData ?? []) as SessionRow[])].sort((a, b) => {
    const statusDiff =
      getSessionStatusRank(a, now) - getSessionStatusRank(b, now);

    if (statusDiff !== 0) return statusDiff;

    return b.createdAt - a.createdAt;
  });

  const revokeSessionMutation = useQueryMutation({
    mutationFn: async (sessionId: string) => {
      return revokeUserSession({ sessionId });
    },
    onSuccess: () => {
      toast.success("Session revoked successfully");
    },
    onError: (error: Error) => {
      toastClientError(error, "Failed to revoke session");
    },
  });

  const revokeAllSessionsMutation = useQueryMutation({
    mutationFn: async () => {
      return revokeUserSessions({ userId });
    },
    onSuccess: () => {
      toast.success("All sessions revoked successfully");
    },
    onError: (error: Error) => {
      toastClientError(error, "Failed to revoke all sessions");
    },
  });

  const getDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) return <Monitor className="size-4" />;

    const ua = userAgent.toLowerCase();
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    ) {
      return <Smartphone className="size-4" />;
    }
    if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="size-4" />;
    }
    return <Monitor className="size-4" />;
  };

  const formatUserAgent = (userAgent?: string | null) => {
    if (!userAgent) return "Unknown device";

    // Extract browser and OS info
    const ua = userAgent;
    let browser = "Unknown";
    let os = "Unknown";

    // Detect browser
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    // Detect OS
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS")) os = "iOS";

    return `${browser} on ${os}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              View and manage user sessions for debugging
            </CardDescription>
          </div>
          {sessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                dialogManager.confirm({
                  title: "Revoke All Sessions",
                  description:
                    "Are you sure you want to revoke all sessions? The user will be logged out from all devices.",
                  action: {
                    label: "Revoke All",
                    onClick: async () => {
                      await revokeAllSessionsMutation.mutateAsync();
                    },
                  },
                });
              }}
              disabled={revokeAllSessionsMutation.isPending}
            >
              <TrashIcon className="mr-2 size-4" />
              Revoke All Sessions
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Monitor />
              </EmptyMedia>
              <EmptyTitle>No active sessions</EmptyTitle>
              <EmptyDescription>
                This user is not currently signed in on any device.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const isActive = getSessionStatus(session, now) === "active";

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(session.userAgent)}
                          <div>
                            <div className="font-medium">
                              {formatUserAgent(session.userAgent)}
                            </div>
                            {session.userAgent && (
                              <div className="text-muted-foreground max-w-[200px] truncate text-xs">
                                {session.userAgent}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm">
                          {session.ipAddress ?? "Unknown"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1.5">
                            <span
                              className={`size-1.5 rounded-full ${
                                isActive ? "bg-emerald-500" : "bg-red-500"
                              }`}
                              aria-hidden="true"
                            />
                            {isActive ? "Active" : "Expired"}
                          </Badge>
                          {session.impersonatedBy && (
                            <Badge variant="outline">Impersonated</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(session.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(session.expiresAt).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(session.expiresAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            revokeSessionMutation.mutate(session.id)
                          }
                          disabled={revokeSessionMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
