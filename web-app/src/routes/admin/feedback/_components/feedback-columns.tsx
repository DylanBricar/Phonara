import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumnMeta } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { dayjs } from "@/lib/dayjs";
import { getInitials } from "@/lib/utils/initials";
import type { ColumnDef } from "@tanstack/react-table";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type Feedback = FunctionReturnType<
  typeof api.admin.feedbacks.listFeedback
>["page"][number];

const REVIEW_LABELS: Record<number, string> = {
  1: "Very poor",
  2: "Poor",
  3: "Neutral",
  4: "Good",
};

export const feedbackColumns: ColumnDef<Feedback>[] = [
  {
    accessorKey: "user",
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
      const feedback = row.original;
      const displayName = feedback.user?.name ?? "Anonymous";
      const displayEmail = feedback.user?.email ?? feedback.email ?? "No email";

      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage
              src={feedback.user?.image ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {feedback.user?.name
                ? getInitials(feedback.user.name)
                : displayEmail.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="text-muted-foreground truncate text-xs">
              {displayEmail}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    meta: {
      skeleton: <Skeleton className="h-4 w-64" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => (
      <Link
        to="/admin/feedback/$feedbackId"
        params={{ feedbackId: row.original._id }}
        className="text-muted-foreground hover:text-foreground block max-w-[520px] truncate text-sm transition-colors"
      >
        {row.original.message}
      </Link>
    ),
  },
  {
    accessorKey: "review",
    header: "Review",
    meta: {
      skeleton: <Skeleton className="h-5 w-20" />,
    } satisfies DataTableColumnMeta,
    cell: ({ row }) => {
      const review = row.original.review;
      return (
        <Badge variant={review > 0 ? "default" : "outline"}>
          {REVIEW_LABELS[review] ?? "No rating"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
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
    cell: ({ row }) => (
      <Button
        variant="ghost"
        className="size-8 p-0"
        aria-label="View feedback"
        asChild
      >
        <Link
          to="/admin/feedback/$feedbackId"
          params={{ feedbackId: row.original._id }}
        >
          <Eye className="size-4" />
        </Link>
      </Button>
    ),
  },
];
