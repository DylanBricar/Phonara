import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { Error401 } from "@/features/page/error-401";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { createNoIndexHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { api } from "@convex/_generated/api";
import type { ApiKeyDto } from "@convex/apiKeys/dto/apiKey";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import ApiKeysEmpty from "./_components/api-keys-empty";
import ApiKeysSkeleton from "./_components/api-keys-skeleton";
import ApiKeysTable from "./_components/api-keys-table";
import GeneratedApiKeyDialogContent from "./_components/generated-api-key-dialog-content";

export const Route = createFileRoute(
  "/orgs/$orgSlug/(navigation)/settings/api-keys/",
)({
  head: ({ params }) =>
    createNoIndexHead({
      title: "API Keys",
      description: `Manage ${SiteConfig.title} organization API keys.`,
      path: `/orgs/${params.orgSlug}/settings/api-keys`,
      section: "Orgs",
    }),
  component: ApiKeysPage,
  pendingComponent: ApiKeysSkeleton,
});

function ApiKeysPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getCurrentOrganization, {
    organizationSlug: orgSlug,
    roles: ["admin"],
  });

  if (org === undefined) return <ApiKeysSkeleton />;
  if (!org) return <Error401 title="API keys unavailable" />;

  return <ApiKeysPanel organizationSlug={orgSlug} />;
}

function ApiKeysPanel({ organizationSlug }: { organizationSlug: string }) {
  const { copyToClipboard } = useCopyToClipboard();

  const apiKeys = useQuery(api.apiKeys.queries.listForOrganization, {
    organizationSlug,
  });
  const createApiKey = useConvexMutation(
    api.apiKeys.mutations.createForOrganization,
  );
  const removeApiKey = useConvexMutation(
    api.apiKeys.mutations.removeForOrganization,
  );

  const openCreateApiKeyDialog = () => {
    dialogManager.input({
      title: "Create API key",
      description: "Create an organization API key for public API requests.",
      icon: KeyRound,
      input: {
        label: "Key name",
        placeholder: "Production integration",
      },
      action: {
        label: "Create Key",
        onClick: async (value) => {
          const name = value?.trim() ?? "";

          if (!name) {
            throw new Error("Enter a key name.");
          }

          if (name.length > 32) {
            throw new Error("Key name must be 32 characters or fewer.");
          }

          const result = await createApiKey({ organizationSlug, name });
          dialogManager.custom({
            title: "New API key",
            description: "Copy this key now. It will not be shown again.",
            icon: KeyRound,
            size: "lg",
            children: (
              <GeneratedApiKeyDialogContent
                apiKey={result.key}
                onCopy={() => {
                  copyToClipboard(result.key);
                  toast.success("API key copied");
                }}
              />
            ),
          });
          toast.success("API key created");
        },
      },
    });
  };

  const handleDelete = (key: ApiKeyDto) => {
    dialogManager.confirm({
      title: "Delete API key",
      description: `Delete ${key.name ?? "this API key"}? Requests using it will stop working immediately.`,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await removeApiKey({ organizationSlug, keyId: key.id });
            toast.success("API key deleted");
          } catch (error) {
            toastClientError(error, "Failed to delete key");
          }
        },
      },
    });
  };

  const handleCopyIdentifier = (key: ApiKeyDto) => {
    copyToClipboard(key.start ?? key.id);
    toast.success("Key identifier copied");
  };

  const isLoading = apiKeys === undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <CardTitle>API Keys</CardTitle>
              <a
                href="/docs/api-me"
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Docs
              </a>
            </div>
            <CardDescription>
              Keys that can access this organization&apos;s public API.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openCreateApiKeyDialog}
            >
              <Plus className="mr-2 size-4" />
              Create Key
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          ) : apiKeys.length === 0 ? (
            <ApiKeysEmpty onCreate={openCreateApiKeyDialog} />
          ) : (
            <ApiKeysTable
              apiKeys={apiKeys}
              onDelete={handleDelete}
              onCopyIdentifier={handleCopyIdentifier}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
