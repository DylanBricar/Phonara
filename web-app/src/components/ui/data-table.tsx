import type { ReactNode } from "react";
import type { Table as TanStackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableMeta = {
  sort?: "asc" | "desc";
  onSortChange?: () => void;
};

export type DataTableColumnMeta = {
  skeleton?: ReactNode;
};

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  isLoading?: boolean;
  loadingRows?: number;
  emptyMessage?: string;
}

export function DataTable<TData>({
  table,
  isLoading,
  loadingRows = 5,
  emptyMessage = "No results.",
}: DataTableProps<TData>) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={i}>
                {table.getVisibleLeafColumns().map((column) => {
                  const skeleton = (
                    column.columnDef.meta as DataTableColumnMeta | undefined
                  )?.skeleton;
                  return (
                    <TableCell key={column.id}>
                      {skeleton ?? <Skeleton className="h-4 w-24" />}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
