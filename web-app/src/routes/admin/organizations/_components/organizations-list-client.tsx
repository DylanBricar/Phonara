import { AutomaticPagination } from "@/components/nowts/automatic-pagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableMeta } from "@/components/ui/data-table";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import Filters, {
  AnimateChangeInHeight,
  type Filter,
  type FilterDefinition,
} from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import {
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, Crown, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import {
  organizationColumns,
  type Organization,
} from "./organizations-columns";

const PLAN_OPTIONS = [
  { name: "free", label: "Free" },
  ...AUTH_PLANS.filter((p) => p.price > 0).map((p) => ({
    name: p.name,
    label: p.name.charAt(0).toUpperCase() + p.name.slice(1),
  })),
];

const FILTER_DEFINITIONS: Record<string, FilterDefinition> = {
  Plan: {
    type: "Plan",
    icon: <Crown className="size-4" />,
    operators: ["is", "is not"],
    options: PLAN_OPTIONS.map((p) => ({ name: p.name, label: p.label })),
  },
};

export function AdminOrganizationsPage() {
  const {
    q: search,
    page,
    plan,
    sort,
  } = useSearch({ from: "/admin/organizations/" });
  const navigate = useNavigate({ from: "/admin/organizations/" });

  const setSearch = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, q: value, page: 1 }) });
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterTypeSelection, setFilterTypeSelection] = useState<string | null>(
    null,
  );

  const filters: Filter[] = plan
    ? [{ id: "plan", type: "Plan", operator: "is", value: [plan] }]
    : [];

  const setFilters: React.Dispatch<React.SetStateAction<Filter[]>> = (
    action,
  ) => {
    const newFilters = typeof action === "function" ? action(filters) : action;
    const newPlan = newFilters.find((f) => f.type === "Plan")?.value[0];
    void navigate({
      search: (prev) => ({ ...prev, plan: newPlan, page: 1 }),
    });
  };

  const organizationsData = useQuery(api.admin.queries.listOrganizations, {
    page,
    pageSize: 10,
    search: search || undefined,
    plan,
    sort,
  });

  const organizations = (organizationsData?.organizations ??
    []) as Organization[];
  const totalPages = organizationsData?.totalPages ?? 0;
  const isLoading = organizationsData === undefined;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: organizations,
    columns: organizationColumns,
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
      <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover
            open={showFilterPopover}
            onOpenChange={(open) => {
              setShowFilterPopover(open);
              if (!open) setFilterTypeSelection(null);
            }}
          >
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
              <AnimateChangeInHeight>
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
                            setFilters([
                              ...filters,
                              {
                                id: option.name,
                                type: def.type,
                                operator: "is",
                                value: [option.name],
                              },
                            ]);
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
        </div>

        <Filters
          filters={filters}
          setFilters={setFilters}
          definitions={FILTER_DEFINITIONS}
        />

        <DataTable
          table={table}
          isLoading={isLoading}
          emptyMessage="No organizations found."
        />

        {totalPages > 1 && (
          <AutomaticPagination
            currentPage={page}
            totalPages={totalPages}
            paramName="page"
          />
        )}
      </div>
    </div>
  );
}
