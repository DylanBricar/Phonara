import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { createNoIndexHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/orgs/$orgSlug/(navigation)/demo/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Demo",
      description: `Private ${SiteConfig.title} organization demo workspace.`,
      path: `/orgs/${params.orgSlug}/demo`,
      section: "Orgs",
    }),
  component: DemoDialogPage,
  pendingComponent: DemoSkeleton,
});

function DemoSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function DemoDialogPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Dialog</CardTitle>
          <CardDescription>
            Standard confirmation dialogs with different variants.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              dialogManager.confirm({
                title: "Publish Changes",
                description:
                  "This will make your changes visible to all team members. Do you want to continue?",
                action: {
                  label: "Publish",
                  onClick: async () => {
                    await wait(1000);
                    toast.success("Changes published");
                  },
                },
              });
            }}
          >
            Default
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              dialogManager.confirm({
                title: "Delete Project",
                description:
                  "This action cannot be undone. All data associated with this project will be permanently removed.",
                variant: "destructive",
                action: {
                  label: "Delete",
                  variant: "destructive",
                  onClick: async () => {
                    await wait(1500);
                    toast.success("Project deleted");
                  },
                },
              });
            }}
          >
            Destructive
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              dialogManager.confirm({
                title: "Downgrade Plan",
                description:
                  "You will lose access to premium features at the end of your billing cycle.",
                variant: "warning",
                action: {
                  label: "Downgrade",
                  onClick: async () => {
                    await wait(1000);
                    toast.success("Plan downgraded");
                  },
                },
              });
            }}
          >
            Warning
          </Button>
        </CardContent>
        <CardFooter>
          <Typography variant="muted">
            Confirm dialogs support default, destructive, and warning variants.
          </Typography>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirm with Text Verification</CardTitle>
          <CardDescription>
            Require the user to type a specific text before confirming.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              dialogManager.confirm({
                title: "Delete Organization",
                description:
                  "This will permanently delete your organization and all its data.",
                variant: "destructive",
                confirmText: "my-org",
                action: {
                  label: "Delete Forever",
                  variant: "destructive",
                  onClick: async () => {
                    await wait(1500);
                    toast.success("Organization deleted");
                  },
                },
              });
            }}
          >
            Type to Confirm
          </Button>
        </CardContent>
        <CardFooter>
          <Typography variant="muted">
            Use confirmText to require exact text match before the action button
            is enabled.
          </Typography>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Input Dialog</CardTitle>
          <CardDescription>
            Prompt the user for text input before performing an action.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              dialogManager.input({
                title: "Rename Project",
                description: "Enter a new name for your project.",
                input: {
                  label: "Project Name",
                  defaultValue: "My Project",
                  placeholder: "Enter project name...",
                },
                action: {
                  label: "Rename",
                  onClick: async (value) => {
                    await wait(1000);
                    toast.success(`Project renamed to "${value}"`);
                  },
                },
              });
            }}
          >
            With Default Value
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              dialogManager.input({
                title: "Send Feedback",
                description: "Share your thoughts with the team.",
                input: {
                  label: "Message",
                  placeholder: "What's on your mind?",
                },
                action: {
                  label: "Send",
                  onClick: async (value) => {
                    await wait(1000);
                    toast.success(`Feedback sent: "${value}"`);
                  },
                },
              });
            }}
          >
            Empty Input
          </Button>
        </CardContent>
        <CardFooter>
          <Typography variant="muted">
            Input dialogs collect a text value and pass it to the action
            callback.
          </Typography>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Dialog</CardTitle>
          <CardDescription>
            Render any custom React content inside a dialog.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              dialogManager.custom({
                title: "Custom Content",
                size: "lg",
                action: {
                  label: "Save",
                  onClick: async () => {
                    await wait(1000);
                    toast.success("Custom action triggered");
                  },
                },
                cancel: {
                  label: "Cancel",
                },
                children: (
                  <div className="flex flex-col gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <Typography variant="small" className="font-medium">
                        This is a custom dialog
                      </Typography>
                      <Typography variant="muted" className="mt-1">
                        You can render any React component here - forms, tables,
                        charts, or any complex UI.
                      </Typography>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <Typography variant="small" className="font-medium">
                        Footer actions
                      </Typography>
                      <Typography variant="muted" className="mt-1">
                        Custom dialogs support optional action and cancel
                        buttons in the footer bar.
                      </Typography>
                    </div>
                  </div>
                ),
              });
            }}
          >
            Custom Content
          </Button>
        </CardContent>
        <CardFooter>
          <Typography variant="muted">
            Custom dialogs accept any ReactNode as children. Use
            dialogManager.closeAll() to close.
          </Typography>
        </CardFooter>
      </Card>
    </div>
  );
}
