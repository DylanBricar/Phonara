import { Form, useForm } from "@/features/form/tanstack-form";
import { RolesKeys, type AuthRole } from "@/lib/auth/auth-permissions";
import { z } from "zod";
import { RoleSelectParts } from "./role-select-parts";

const InviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(RolesKeys).default("member"),
});

export type InviteMemberValues = z.infer<typeof InviteMemberSchema>;

export function InviteMemberForm({
  className = "flex flex-col gap-4",
  fieldsLayout = "stacked",
  formId,
  onSubmit,
  roles,
  showSubmitButton = true,
  submitButtonClassName = "w-full",
  submitLabel = "Send invite",
}: {
  className?: string;
  fieldsLayout?: "stacked" | "inline";
  formId?: string;
  onSubmit: (values: InviteMemberValues) => void | Promise<void>;
  roles: readonly AuthRole[];
  showSubmitButton?: boolean;
  submitButtonClassName?: string;
  submitLabel?: string;
}) {
  const form = useForm({
    schema: InviteMemberSchema,
    defaultValues: {
      email: "",
      role: "member",
    },
    onSubmit,
  });

  const isInline = fieldsLayout === "inline";

  return (
    <Form id={formId} form={form} className={className}>
      <div className={isInline ? "flex items-end gap-4" : "flex flex-col gap-4"}>
        <form.AppField name="email">
          {(field) => (
            <field.Field className={isInline ? "flex-2" : undefined}>
              <field.Label>Email</field.Label>
              <field.Content>
                <field.Input type="email" placeholder="colleague@company.com" />
                <field.Message />
              </field.Content>
            </field.Field>
          )}
        </form.AppField>

        <form.AppField name="role">
          {(field) => (
            <field.Field className={isInline ? "flex-1" : undefined}>
              <field.Label>Role</field.Label>
              <field.Content>
                <field.Select>
                  <RoleSelectParts roles={roles} />
                </field.Select>
                <field.Message />
              </field.Content>
            </field.Field>
          )}
        </form.AppField>
      </div>

      {showSubmitButton ? (
        <form.SubmitButton className={submitButtonClassName}>
          {submitLabel}
        </form.SubmitButton>
      ) : null}
    </Form>
  );
}
