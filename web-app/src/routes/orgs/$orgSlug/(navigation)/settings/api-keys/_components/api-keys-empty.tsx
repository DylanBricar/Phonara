import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { KeyRound, Plus } from "lucide-react";

type ApiKeysEmptyProps = {
  onCreate: () => void;
};

export default function ApiKeysEmpty({ onCreate }: ApiKeysEmptyProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRound />
        </EmptyMedia>
        <EmptyTitle>No API keys</EmptyTitle>
        <EmptyDescription>
          Create a key to call the public API for this organization.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" size="sm" variant="outline" onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Create Key
        </Button>
      </EmptyContent>
    </Empty>
  );
}
