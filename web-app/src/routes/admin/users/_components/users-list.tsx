import { AutomaticPagination } from "@/components/nowts/automatic-pagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableMeta } from "@/components/ui/data-table";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import Filters, {
  type Filter,
  type FilterDefinition,
  AnimateChangeInHeight,
} from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ChevronDown,
  Circle,
  Crown,
  ListFilter,
  Plus,
  Search,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { nanoid } from "nanoid";
import { openCreateUserDialog } from "./create-user-dialog";
import { userColumns, type User } from "./users-columns";

const FILTER_DEFINITIONS: Record<string, FilterDefinition> = {
  Role: {
    type: "Role",
    icon: <UserCog className="size-4" />,
    operators: ["is", "is not"],
    options: [
      { name: "admin", icon: <Crown className="size-4" /> },
      { name: "user", icon: <UserCog className="size-4" /> },
    ],
  },
  Status: {
    type: "Status",
    icon: <Circle className="size-4" />,
    operators: ["is", "is not"],
    options: [
      {
        name: "active",
        icon: <Circle className="fill-primary text-primary size-4" />,
      },
      {
        name: "banned",
        icon: <Circle className="fill-destructive text-destructive size-4" />,
      },
    ],
  },
};

export function AdminUsersPage() {
  const {
    q: search,
    page,
    role,
    status,
    sort,
  } = useSearch({ from: "/admin/users/" });
  const navigate = useNavigate({ from: "/admin/users/" });

  const setSearch = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) });
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterTypeSelection, setFilterTypeSelection] = useState<string | null>(
    null,
  );

  const filters: Filter[] = [
    ...(role
      ? [{ id: "role", type: "Role", operator: "is", value: [role] }]
      : []),
    ...(status
      ? [{ id: "status", type: "Status", operator: "is", value: [status] }]
      : []),
  ];

  const setFilters: React.Dispatch<React.SetStateAction<Filter[]>> = (
    action,
  ) => {
    const newFilters = typeof action === "function" ? action(filters) : action;
    const newRole = newFilters.find((f) => f.type === "Role")?.value[0] as
      | "admin"
      | "user"
      | undefined;
    const newStatus = newFilters.find((f) => f.type === "Status")?.value[0] as
      | "active"
      | "banned"
      | undefined;
    void navigate({
      search: (prev) => ({
        ...prev,
        role: newRole,
        status: newStatus,
        page: 1,
      }),
    });
  };

  const usersData = useQuery(api.admin.queries.listUsers, {
    page,
    pageSize: 10,
    search: search || undefined,
    role,
    status,
    sort,
  });

  const users = (usersData?.users ?? []) as User[];
  const totalPages = usersData?.totalPages ?? 0;
  const isLoading = usersData === undefined;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnVisibility },
    meta: {
      sort,
      onSortChange: () => {
        void navigate({
          search: (prev) => ({
            ...prev,
            sort: sort === "asc" ? "desc" : "asc",
          }),
        });
      },
    } satisfies DataTableMeta,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Open filters"
              >
                <ListFilter className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0">
              <AnimateChangeInHeight className="overflow-hidden">
                {filterTypeSelection === null ? (
                  <div className="flex flex-col gap-1 p-2">
                    {Object.entries(FILTER_DEFINITIONS).map(([key, def]) => (
                      <button
                        key={key}
                        onClick={() => setFilterTypeSelection(key)}
                        className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                      >
                        {def.icon}
                        {def.type}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 p-2">
                    <button
                      onClick={() => setFilterTypeSelection(null)}
                      className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                    >
                      <ChevronDown className="size-4 rotate-90" />
                      Back
                    </button>
                    {FILTER_DEFINITIONS[filterTypeSelection].options.map(
                      (option) => (
                        <button
                          key={option.name}
                          onClick={() => {
                            const def = FILTER_DEFINITIONS[filterTypeSelection];
                            const newFilter: Filter = {
                              id: nanoid(),
                              type: def.type,
                              operator: "is",
                              value: [option.name],
                            };
                            setFilters([...filters, newFilter]);
                            setFilterTypeSelection(null);
                            setShowFilterPopover(false);
                          }}
                          className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                        >
                          {option.icon}
                          {option.label ?? option.name}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </AnimateChangeInHeight>
            </PopoverContent>
          </Popover>

          <DataTableViewOptions table={table} />

          <div className="flex-1" />

          <Button className="gap-1.5" onClick={() => openCreateUserDialog()}>
            <Plus className="size-4" />
            Create user
          </Button>
        </div>

        {filters.length > 0 && (
          <div className="flex items-center gap-2">
            <Filters
              filters={filters}
              setFilters={setFilters}
              definitions={FILTER_DEFINITIONS}
            />
          </div>
        )}

        <DataTable
          table={table}
          isLoading={isLoading}
          emptyMessage="No users found."
        />

        {totalPages > 1 && (
          <AutomaticPagination
            currentPage={page}
            totalPages={totalPages}
            searchParam={search}
            paramName="page"
          />
        )}
      </div>
    </div>
  );
}
