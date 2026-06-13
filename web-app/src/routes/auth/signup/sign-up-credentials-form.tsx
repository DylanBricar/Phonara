import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import type { LoginCredentialsFormType } from "./signup.schema";
import { LoginCredentialsFormScheme } from "./signup.schema";

export const SignUpCredentialsForm = ({
  callbackUrl,
}: {
  callbackUrl: string;
}) => {
  const router = useRouter();
  const submitMutation = useQueryMutation({
    mutationFn: async (values: LoginCredentialsFormType) => {
      return unwrapSafePromise(
        authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.name,
          image: values.image,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to sign up");
    },
    onSuccess: () => {
      void router.navigate({ to: callbackUrl });
    },
  });

  const form = useForm({
    schema: LoginCredentialsFormScheme,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      verifyPassword: "",
      image: "",
    },
    onSubmit: async (values) => {
      if (values.password !== values.verifyPassword) {
        toast.error("Password does not match");
        return;
      }

      await submitMutation.mutateAsync(values);
    },
  });

  return (
    <Form form={form} className="max-w-lg space-y-4">
      <form.AppField name="name">
        {(field) => (
          <field.Field>
            <field.Label>Name</field.Label>
            <field.Content>
              <field.Input placeholder="John Doe" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input type="email" placeholder="john@doe.com" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => (
          <field.Field>
            <field.Label>Password</field.Label>
            <field.Content>
              <field.Input type="password" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="verifyPassword">
        {(field) => (
          <field.Field>
            <field.Label>Verify Password</field.Label>
            <field.Content>
              <field.Input type="password" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.SubmitButton className="w-full">Sign up</form.SubmitButton>
    </Form>
  );
};
