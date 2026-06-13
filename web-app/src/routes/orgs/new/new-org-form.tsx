import {
  NowStackDialogCloseButton,
  NowStackDialogEnterHint,
  NowStackDialogFooterBar,
} from "@/components/nowts/dialog-nowstack";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { toastClientError } from "@/lib/errors/client-error-message";
import { formatId } from "@/lib/format/id";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useRouter } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "sonner";
import type { NewOrganizationSchemaType } from "./new-org.schema";
import { CreateOrgSchema } from "./new-org.schema";

type NewOrganizationFormProps = {
  variant?: "card" | "dialog";
};

export const NewOrganizationForm = ({
  variant = "card",
}: NewOrganizationFormProps) => {
  const router = useRouter();
  const createOrganization = useConvexMutation(
    api.auth.mutations.createOrganization,
  );
  const checkOrganizationSlug = useConvexMutation(
    api.auth.mutations.checkOrganizationSlug,
  );

  const handleCreateOrganization = async (
    values: NewOrganizationSchemaType,
  ) => {
    try {
      const organization = await createOrganization({
        name: values.name,
        slug: values.slug,
      });

      if (!organization) {
        throw new Error("Failed to create organization");
      }

      toast.success("Organization created successfully");
      void router.navigate({
        to: "/orgs/$orgSlug",
        params: { orgSlug: organization.slug },
      });
    } catch (error) {
      toastClientError(error, "Failed to create organization");
    }
  };

  const form = useForm({
    schema: CreateOrgSchema,
    defaultValues: {
      name: "",
      slug: "",
    },
    onSubmit: async (values) => {
      await handleCreateOrganization(values);
    },
  });

  const fields = (
    <div
      className={cn(
        "flex flex-col gap-4",
        variant === "card" ? "lg:gap-6" : "p-5",
      )}
    >
      <form.AppField name="name">
        {(field) => (
          <field.Field>
            <field.Label>Organization Name</field.Label>
            <field.Content>
              <field.Input
                type="text"
                className="input"
                placeholder="Enter organization name"
                onChange={(e) => {
                  const value = e.target.value;
                  field.handleChange(value);
                  const formattedSlug = formatId(value);
                  form.setFieldValue("slug", formattedSlug);
                }}
              />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
      <form.AppField
        name="slug"
        asyncDebounceMs={300}
        validators={{
          onChangeAsync: async ({ value }) => {
            if (!value) {
              return undefined;
            }

            try {
              await checkOrganizationSlug({ slug: value });
            } catch {
              return "This organization ID is already taken";
            }

            return undefined;
          },
        }}
      >
        {(field) => (
          <field.Field>
            <field.Label>Organization Slug</field.Label>
            <field.Content>
              <field.Input
                type="text"
                className="input"
                placeholder="Enter organization Slug"
              />
              <field.Description>
                The organization ID is used to identify the organization, it
                will be used in all the URLs.
              </field.Description>
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
    </div>
  );

  const submitButton = (
    <form.SubmitButton size="lg">Create organization</form.SubmitButton>
  );

  if (variant === "dialog") {
    return (
      <Form form={form} className="contents">
        {fields}
        <NowStackDialogFooterBar>
          <NowStackDialogCloseButton />
          <form.SubmitButton size="sm">
            Create organization
            <NowStackDialogEnterHint />
          </form.SubmitButton>
        </NowStackDialogFooterBar>
      </Form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 lg:gap-8">
      <Card className="bg-card gap-6 overflow-hidden">
        <Form form={form}>
          <CardContent className="py-2">{fields}</CardContent>
          <CardFooter className="border-border flex justify-end border-t py-4">
            {submitButton}
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
};
