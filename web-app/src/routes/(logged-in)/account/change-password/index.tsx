import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { toastClientError } from "@/lib/errors/client-error-message";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { AccountCardSkeleton } from "../_components/account-card-skeleton";

export const Route = createFileRoute("/(logged-in)/account/change-password/")({
  head: () => ({ meta: [{ title: "Change Password" }] }),
  component: ChangePasswordPage,
  pendingComponent: () => <AccountCardSkeleton contentLines={4} />,
});

const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormType = z.infer<typeof ChangePasswordFormSchema>;

function ChangePasswordPage() {
  const router = useRouter();

  const changePasswordMutation = useQueryMutation({
    mutationFn: async (values: ChangePasswordFormType) => {
      return unwrapSafePromise(
        authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          revokeOtherSessions: values.revokeOtherSessions,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to change password");
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      void router.navigate({ to: "/account" });
    },
  });

  const form = useForm({
    schema: ChangePasswordFormSchema,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
    onSubmit: async (values) => {
      await changePasswordMutation.mutateAsync(values);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <Form form={form}>
        <CardContent className="flex flex-col gap-4">
          <form.AppField name="currentPassword">
            {(field) => (
              <field.Field>
                <field.Label>Current Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="newPassword">
            {(field) => (
              <field.Field>
                <field.Label>New Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.Field>
                <field.Label>Confirm New Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="revokeOtherSessions">
            {(field) => (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="flex flex-col gap-0.5">
                  <field.Label>Sign out from other devices</field.Label>
                  <field.Description>
                    This will sign you out from all other devices where you're
                    currently logged in
                  </field.Description>
                </div>
                <field.Switch />
              </div>
            )}
          </form.AppField>
          <form.SubmitButton className="w-full">
            Change Password
          </form.SubmitButton>
        </CardContent>
      </Form>
    </Card>
  );
}
