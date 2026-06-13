import type { ColumnDef } from "@tanstack/react-table";
import type { DataTableColumnMeta } from "@/components/ui/data-table";
import { DataTableSortHeader } from "@/components/ui/data-table-sort-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { dayjs } from "@/lib/dayjs";
import { getInitials } from "@/lib/utils/initials";
import { Link } from "@tanstack/react-router";
import { Eye, MoreHorizontal, Users } from "lucide-react";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: string | null;
  createdAt: number;
  _count?: { members: number };
};

const getPlanBadgeVariant = (plan?: string | null) => {
  if (!plan || plan === "free") return "outline" as const;
  return "default" as const;
};

export const organizationColumns: ColumnDef<Organization>[] = [
  {
    accessorKey: "name",
    header: "Organization",
    enableHiding: false,
    meta: {
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ),
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const org = row.original;
      return (
        <Link
          to="/admin/organizations/$orgId"
          params={{ orgId: org.id }}
          className="flex items-center gap-3"
        >
          <Avatar className="size-9 rounded-lg">
            {org.logo ? <AvatarImage src={org.logo} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
              {getInitials(org.name || "O")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{org.name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {org.slug}
            </div>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: "plan",
    header: "Plan",
    meta: {
      skeleton: <Skeleton className="h-5 w-14" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <Badge variant={getPlanBadgeVariant(row.original.plan)}>
        {row.original.plan ?? "free"}
      </Badge>
    ),
  },
  {
    id: "members",
    header: "Members",
    meta: {
      skeleton: <Skeleton className="h-4 w-8" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Users className="text-muted-foreground size-4" />
        <span className="text-sm">{row.original._count?.members ?? 0}</span>
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: (context) => (
      <DataTableSortHeader title="Created" context={context} />
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
    cell: ({ row }) => {
      const org = row.original;
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/admin/organizations/$orgId" params={{ orgId: org.id }}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
