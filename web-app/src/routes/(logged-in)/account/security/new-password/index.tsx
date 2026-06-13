import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { toastClientError } from "@/lib/errors/client-error-message";
import { api } from "@convex/_generated/api";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { z } from "zod";
import { AccountCardSkeleton } from "../../_components/account-card-skeleton";
import { getProviderConfig } from "../../_components/provider-config";

export const Route = createFileRoute(
  "/(logged-in)/account/security/new-password/",
)({
  head: () => ({ meta: [{ title: "Create Password" }] }),
  pendingComponent: () => <AccountCardSkeleton contentLines={2} />,
  component: NewPasswordPageRoute,
});

function NewPasswordPageRoute() {
  const accounts = useQuery(api.auth.queries.listUserAccounts, {});

  if (accounts === undefined) {
    return <AccountCardSkeleton contentLines={2} />;
  }

  const hasPassword = accounts.some(
    (acc: { providerId: string }) =>
      acc.providerId === "credential" || acc.providerId === "credentials",
  );

  if (hasPassword) {
    return <Navigate to="/account/change-password" replace />;
  }

  const oauthProvider = accounts.find(
    (acc: { providerId: string }) =>
      acc.providerId !== "credential" && acc.providerId !== "credentials",
  );

  const providerName = oauthProvider
    ? getProviderConfig(oauthProvider.providerId).name
    : "OAuth";

  return <NewPasswordPage providerName={providerName} />;
}

const SetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function NewPasswordPage({ providerName }: { providerName: string }) {
  const router = useRouter();
  const setPassword = useConvexMutation(api.auth.mutations.setPassword);

  const setPasswordMutation = useQueryMutation({
    mutationFn: async (values: z.infer<typeof SetPasswordFormSchema>) => {
      return setPassword({ newPassword: values.newPassword });
    },
    onError: (error) => {
      toastClientError(error, "Failed to create password");
    },
    onSuccess: () => {
      toast.success("Password created successfully");
      void router.navigate({ to: "/account/security" });
    },
  });

  const form = useForm({
    schema: SetPasswordFormSchema,
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async (values) => {
      await setPasswordMutation.mutateAsync(values);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account Password</CardTitle>
        <CardDescription>
          Your account is managed by <strong>{providerName}</strong>. Set a
          password to also sign in with email and password.
        </CardDescription>
      </CardHeader>
      <Form form={form} className="flex flex-col gap-6">
        <CardContent className="flex flex-col gap-4">
          <form.AppField name="newPassword">
            {(field) => (
              <field.Field>
                <field.Label>New Password</field.Label>
                <field.Content>
                  <field.Input
                    type="password"
                    className="max-w-sm"
                    autoComplete="new-password"
                  />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.Field>
                <field.Label>Confirm Password</field.Label>
                <field.Content>
                  <field.Input
                    type="password"
                    className="max-w-sm"
                    autoComplete="new-password"
                  />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </CardContent>
        <CardFooter className="justify-between">
          <Typography variant="muted">
            Must be at least 8 characters.
          </Typography>
          <form.SubmitButton size="sm">
            Create account password
          </form.SubmitButton>
        </CardFooter>
      </Form>
    </Card>
  );
}
