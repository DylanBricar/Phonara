import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { formatId } from "@/lib/format/id";
import { api } from "@convex/_generated/api";
import { useRouter } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { useCurrentOrg } from "@/hooks/use-current-org";
import type { OrgDangerFormSchemaType } from "../org.schema";
import { OrgDangerFormSchema } from "../org.schema";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

type ProductFormProps = {
  defaultValues: OrgDangerFormSchemaType;
};

export const OrganizationDangerForm = ({ defaultValues }: ProductFormProps) => {
  const router = useRouter();
  const org = useCurrentOrg();
  const updateOrganization = useConvexMutation(
    api.auth.mutations.updateOrganization,
  );

  const handleUpdateSlug = async (values: OrgDangerFormSchemaType) => {
    if (!org?.id) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      const data = await updateOrganization({
        organizationId: org.id,
        data: {
          slug: values.slug,
        },
      });
      const nextSlug = data?.slug ?? values.slug;
      void router.navigate({
        to: "/orgs/$orgSlug/settings/danger",
        params: { orgSlug: nextSlug },
      });
      form.reset();
    } catch (error) {
      toastClientError(error, "Failed to update organization");
    }
  };

  const form = useForm({
    schema: OrgDangerFormSchema,
    defaultValues,
    onSubmit: async (values) => {
      dialogManager.confirm({
        title: "Are you sure ?",
        description:
          "You are about to change the unique identifier of your organization. All the previous URLs will be changed.",
        action: {
          label: "Yes, change the slug",
          onClick: () => {
            void handleUpdateSlug(values);
          },
        },
      });
    },
  });

  return (
    <Form form={form}>
      <div className="flex w-full flex-col gap-6 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Slug</CardTitle>
            <CardDescription>
              Slug is the unique identifier of your organization. It's used in
              all the URLs, if you change it, all your URLs will be broken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.AppField name="slug">
              {(field) => (
                <field.Field>
                  <field.Content>
                    <field.Input
                      type="text"
                      placeholder="my-organization"
                      onChange={(e) => {
                        const slug = formatId(e.target.value);
                        field.handleChange(slug);
                      }}
                    />
                    <field.Message />
                  </field.Content>
                </field.Field>
              )}
            </form.AppField>
          </CardContent>
          <CardFooter className="border-tu flex justify-end">
            <form.SubmitButton>Save</form.SubmitButton>
          </CardFooter>
        </Card>
      </div>
    </Form>
  );
};
