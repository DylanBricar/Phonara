import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ApiKeyDto } from "@convex/apiKeys/dto/apiKey";
import { Copy, MoreHorizontal, Trash } from "lucide-react";
import { formatDate } from "./format-date";

type ApiKeyRowProps = {
  apiKey: ApiKeyDto;
  onDelete: (key: ApiKeyDto) => void;
  onCopyIdentifier: (key: ApiKeyDto) => void;
};

export default function ApiKeyRow({
  apiKey,
  onDelete,
  onCopyIdentifier,
}: ApiKeyRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {apiKey.name ?? "Untitled key"}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {apiKey.start ?? `${apiKey.prefix ?? "nsk_"}...`}
      </TableCell>
      <TableCell>
        <Badge variant={apiKey.enabled ? "outline" : "destructive"}>
          {apiKey.enabled ? "Active" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
      <TableCell>{formatDate(apiKey.lastRequest)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Open actions for ${apiKey.name ?? "API key"}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyIdentifier(apiKey)}>
              <Copy className="size-4" />
              Copy identifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(apiKey)}
            >
              <Trash className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
