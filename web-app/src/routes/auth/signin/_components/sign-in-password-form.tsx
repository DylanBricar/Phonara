import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { toastClientError } from "@/lib/errors/client-error-message";
import { z } from "zod";

const LoginCredentialsFormScheme = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type LoginCredentialsFormType = z.infer<typeof LoginCredentialsFormScheme>;

export const SignInPasswordForm = (props: {
  callbackUrl: string;
  email?: string;
}) => {
  const router = useRouter();
  const signInMutation = useQueryMutation({
    mutationFn: async (values: LoginCredentialsFormType) => {
      return unwrapSafePromise(
        authClient.signIn.email({
          email: values.email,
          password: values.password,
          rememberMe: true,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to sign in");
    },
    onSuccess: () => {
      void router.navigate({ to: props.callbackUrl });
    },
  });

  const form = useForm({
    schema: LoginCredentialsFormScheme,
    defaultValues: {
      email: props.email ?? "",
      password: "",
    },
    onSubmit: async (values) => {
      await signInMutation.mutateAsync(values).catch(() => {
        // Error handled by mutation's onError
      });
    },
  });

  return (
    <Form form={form} className="max-w-lg space-y-4">
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
          <field.Field className="flex-1">
            <div className="flex items-center justify-between">
              <field.Label>Password</field.Label>
              <Link
                to="/auth/forget-password"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                tabIndex={-1}
              >
                Forgot password ?
              </Link>
            </div>
            <field.Content>
              <field.Input type="password" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.SubmitButton className="ring-offset-card w-full ring-offset-2">
        Sign in
      </form.SubmitButton>
    </Form>
  );
};
