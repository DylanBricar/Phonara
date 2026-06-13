import type { ColumnDef } from "@tanstack/react-table";
import type { DataTableColumnMeta } from "@/components/ui/data-table";
import { DataTableSortHeader } from "@/components/ui/data-table-sort-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { redirectAfterAuthSessionChange } from "@/lib/auth/session-transition";
import { dayjs } from "@/lib/dayjs";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle2,
  Crown,
  MoreHorizontal,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

export type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role?: string;
  banned?: boolean | null;
  createdAt: number;
};

function UserActionsMenu({ user }: { user: User }) {
  const banUserMutation = useQueryMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(
        authClient.admin.banUser({ userId, banReason: "Admin initiated ban" }),
      );
    },
    onSuccess: () => {
      toast.success("User has been banned");
    },
    onError: (error: Error) => toastClientError(error, "Failed to ban user"),
  });

  const unbanUserMutation = useQueryMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(authClient.admin.unbanUser({ userId }));
    },
    onSuccess: () => {
      toast.success("User has been unbanned");
    },
    onError: (error: Error) => toastClientError(error, "Failed to unban user"),
  });

  const setRoleMutation = useQueryMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "user";
    }) => {
      return unwrapSafePromise(authClient.admin.setRole({ userId, role }));
    },
    onSuccess: () => {
      toast.success("User role updated");
    },
    onError: (error: Error) => toastClientError(error, "Failed to update user role"),
  });

  const impersonateMutation = useQueryMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(authClient.admin.impersonateUser({ userId }));
    },
    onSuccess: () => {
      toast.success("Now impersonating user");
      redirectAfterAuthSessionChange("/orgs");
    },
    onError: (error: Error) => toastClientError(error, "Failed to impersonate user"),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-8 p-0"
          aria-label="Open actions menu"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {!user.banned && (
          <DropdownMenuItem
            onClick={() => impersonateMutation.mutate(user.id)}
            disabled={impersonateMutation.isPending}
          >
            <UserCog className="mr-2 size-4" />
            Impersonate
          </DropdownMenuItem>
        )}
        {user.role !== "admin" && (
          <DropdownMenuItem
            onClick={() =>
              setRoleMutation.mutate({ userId: user.id, role: "admin" })
            }
            disabled={setRoleMutation.isPending}
          >
            <Crown className="mr-2 size-4" />
            Make Admin
          </DropdownMenuItem>
        )}
        {user.role === "admin" && (
          <DropdownMenuItem
            onClick={() =>
              setRoleMutation.mutate({ userId: user.id, role: "user" })
            }
            disabled={setRoleMutation.isPending}
          >
            <UserCog className="mr-2 size-4" />
            Make Regular User
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {user.banned ? (
          <DropdownMenuItem
            onClick={() => unbanUserMutation.mutate(user.id)}
            disabled={unbanUserMutation.isPending}
            className="text-primary"
          >
            <CheckCircle2 className="mr-2 size-4" />
            Unban User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => banUserMutation.mutate(user.id)}
            disabled={banUserMutation.isPending}
            className="text-destructive"
          >
            <Ban className="mr-2 size-4" />
            Ban User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "User",
    enableHiding: false,
    meta: {
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ),
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Link
          to="/admin/users/$userId"
          params={{ userId: user.id }}
          className="flex items-center gap-3"
        >
          <Avatar className="size-8">
            {user.image ? <AvatarImage src={user.image} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{user.name}</span>
              {user.banned && (
                <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[10px] font-medium">
                  Banned
                </span>
              )}
              {user.role === "admin" && (
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium">
                  Admin
                </span>
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {user.email}
            </div>
          </div>
        </Link>
      );
    },
  },
  {
    id: "lastSignedIn",
    header: "Last signed in",
    meta: {
      skeleton: <Skeleton className="h-4 w-8" />,
    } satisfies DataTableColumnMeta,
    cell: () => <span className="text-muted-foreground text-sm">{"-"}</span>,
  },
  {
    accessorKey: "createdAt",
    id: "joined",
    header: (context) => (
      <DataTableSortHeader title="Joined" context={context} />
    ),
    meta: {
      skeleton: <Skeleton className="h-4 w-28" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {dayjs(row.original.createdAt).format("MMMM D, YYYY")}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    meta: {
      skeleton: <Skeleton className="size-4" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => <UserActionsMenu user={row.original} />,
  },
];
