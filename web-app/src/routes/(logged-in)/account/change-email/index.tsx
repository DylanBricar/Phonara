import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { toastClientError } from "@/lib/errors/client-error-message";
import { authClient, useSession } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { AccountCardSkeleton } from "../_components/account-card-skeleton";

export const Route = createFileRoute("/(logged-in)/account/change-email/")({
  head: () => ({ meta: [{ title: "Change Email" }] }),
  component: ChangeEmailPage,
  pendingComponent: () => <AccountCardSkeleton />,
});

const ChangeEmailFormSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
});

type ChangeEmailFormType = z.infer<typeof ChangeEmailFormSchema>;

function ChangeEmailPage() {
  const router = useRouter();
  const session = useSession();

  const changeEmailMutation = useQueryMutation({
    mutationFn: async (values: ChangeEmailFormType) => {
      return unwrapSafePromise(
        authClient.changeEmail({
          newEmail: values.newEmail,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to change email");
    },
    onSuccess: () => {
      toast.success("Verification email sent. Please check your inbox.");
      void router.navigate({ to: "/account" });
    },
  });

  const form = useForm({
    schema: ChangeEmailFormSchema,
    defaultValues: {
      newEmail: session.data?.user.email ?? "",
    },
    onSubmit: async (values) => {
      await changeEmailMutation.mutateAsync(values);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
        <CardDescription>
          Enter your new email address. We'll send a verification link to
          confirm the change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form form={form} className="flex flex-col gap-4">
          <form.AppField name="newEmail">
            {(field) => (
              <field.Field>
                <field.Label>New Email</field.Label>
                <field.Content>
                  <field.Input
                    type="email"
                    placeholder="new-email@example.com"
                  />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.SubmitButton className="w-full">Change Email</form.SubmitButton>
        </Form>
      </CardContent>
    </Card>
  );
}
