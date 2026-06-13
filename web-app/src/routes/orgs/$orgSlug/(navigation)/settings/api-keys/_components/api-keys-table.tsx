import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiKeyDto } from "@convex/apiKeys/dto/apiKey";
import ApiKeyRow from "./api-key-row";

type ApiKeysTableProps = {
  apiKeys: ApiKeyDto[];
  onDelete: (key: ApiKeyDto) => void;
  onCopyIdentifier: (key: ApiKeyDto) => void;
};

export default function ApiKeysTable({
  apiKeys,
  onDelete,
  onCopyIdentifier,
}: ApiKeysTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Identifier</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead className="w-10 text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((key) => (
          <ApiKeyRow
            key={key.id}
            apiKey={key}
            onDelete={onDelete}
            onCopyIdentifier={onCopyIdentifier}
          />
        ))}
      </TableBody>
    </Table>
  );
}
