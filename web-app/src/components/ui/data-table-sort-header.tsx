import type { HeaderContext } from "@tanstack/react-table";
import type { DataTableMeta } from "@/components/ui/data-table";
import { ChevronDown } from "lucide-react";

interface DataTableSortHeaderProps<TData> {
  title: string;
  context: HeaderContext<TData, unknown>;
}

export function DataTableSortHeader<TData>({
  title,
  context,
}: DataTableSortHeaderProps<TData>) {
  const meta = context.table.options.meta as DataTableMeta | undefined;
  return (
    <button className="flex items-center gap-1" onClick={meta?.onSortChange}>
      {title}
      <ChevronDown
        className={`size-3.5 transition-transform ${meta?.sort === "asc" ? "rotate-180" : ""}`}
      />
    </button>
  );
}
