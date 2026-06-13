import { TableCell, TableRow } from "@/components/ui/table";

export function EmptyTableRow({
  children,
  colSpan,
}: {
  children: string;
  colSpan: number;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}
