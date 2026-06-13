import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";

type GeneratedApiKeyDialogContentProps = {
  apiKey: string;
  onCopy: () => void;
};

export default function GeneratedApiKeyDialogContent({
  apiKey,
  onCopy,
}: GeneratedApiKeyDialogContentProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input readOnly value={apiKey} className="min-w-0 font-mono text-sm" />
      <Button type="button" variant="outline" onClick={onCopy}>
        <Copy className="mr-2 size-4" />
        Copy
      </Button>
    </div>
  );
}
