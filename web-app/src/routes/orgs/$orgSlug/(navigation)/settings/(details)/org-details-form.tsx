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
import AvatarUpload from "@/features/images/avatar-upload";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { api } from "@convex/_generated/api";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import {
  OrgDetailsFormSchema,
  type OrgDetailsFormSchemaType,
} from "../org.schema";

type ProductFormProps = {
  defaultValues: OrgDetailsFormSchemaType;
};

export const OrgDetailsForm = ({ defaultValues }: ProductFormProps) => {
  return (
    <div className="flex flex-col gap-6">
      <OrgLogoForm defaultLogo={defaultValues.logo ?? null} />
      <OrgNameForm defaultName={defaultValues.name} />
    </div>
  );
};

const LogoFormSchema = OrgDetailsFormSchema.pick({ logo: true });
const NameFormSchema = z.object({ name: z.string().min(1).max(32) });

function OrgLogoForm({ defaultLogo }: { defaultLogo: string | null }) {
  const org = useCurrentOrg();
  const uploadOrgImage = useAction(api.files.actions.uploadOrgImage);
  const updateOrganization = useConvexMutation(
    api.auth.mutations.updateOrganization,
  );
  const [logoUploadFailed, setLogoUploadFailed] = useState(false);

  const handleUpdateLogo = async (values: { logo?: string | null }) => {
    if (!org?.id) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      await updateOrganization({
        organizationId: org.id,
        data: {
          logo: values.logo ?? null,
        },
      });
      toast.success("Organization logo updated");
    } catch (error) {
      toastClientError(error, "Failed to update organization logo");
    }
  };

  const uploadImageMutation = useQueryMutation({
    onMutate: () => {
      setLogoUploadFailed(false);
    },
    mutationFn: async (file: File) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return uploadOrgImage({
        organizationSlug: org?.slug ?? "",
        base64,
        fileName: file.name,
        mimeType: file.type,
      });
    },
    onSuccess: (data) => {
      form.setFieldValue("logo", data);
      setLogoUploadFailed(false);
    },
    onError: (error) => {
      setLogoUploadFailed(true);
      toastClientError(error, "Failed to upload organization logo");
    },
  });

  const form = useForm({
    schema: LogoFormSchema,
    defaultValues: { logo: defaultLogo },
    onSubmit: async (values) => {
      if (uploadImageMutation.isPending) {
        toast.error("Wait for the logo upload to finish");
        return;
      }

      if (logoUploadFailed) {
        toast.error("Upload the logo successfully before saving");
        return;
      }

      await handleUpdateLogo(values);
    },
  });

  return (
    <Form form={form}>
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Organization Logo</CardTitle>
            <CardDescription>
              Click the logo to upload a new image.
            </CardDescription>
          </div>
          <form.AppField name="logo">
            {(field) => (
              <AvatarUpload
                onChange={(file) => uploadImageMutation.mutate(file)}
                onRemove={() => {
                  setLogoUploadFailed(false);
                  field.setValue(null);
                }}
                initialFile={field.state.value ?? undefined}
                isPending={uploadImageMutation.isPending}
              />
            )}
          </form.AppField>
        </CardHeader>
        <CardFooter className="justify-between">
          <Typography variant="muted">
            Square image recommended. Max file size: 2MB.
          </Typography>
          <form.SubmitButton
            disabled={uploadImageMutation.isPending || logoUploadFailed}
            size="sm"
            variant="outline"
          >
            Save Changes
          </form.SubmitButton>
        </CardFooter>
      </Card>
    </Form>
  );
}

function OrgNameForm({ defaultName }: { defaultName: string }) {
  const org = useCurrentOrg();
  const updateOrganization = useConvexMutation(
    api.auth.mutations.updateOrganization,
  );

  const handleUpdateName = async (values: { name: string }) => {
    if (!org?.id) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      await updateOrganization({
        organizationId: org.id,
        data: {
          name: values.name,
        },
      });
      toast.success("Organization name updated");
    } catch (error) {
      toastClientError(error, "Failed to update organization");
    }
  };

  const form = useForm({
    schema: NameFormSchema,
    defaultValues: { name: defaultName },
    onSubmit: async (values) => {
      await handleUpdateName(values);
    },
  });

  return (
    <Form form={form}>
      <Card>
        <CardHeader>
          <CardTitle>Organization Name</CardTitle>
          <CardDescription>
            This is your organization's visible name. You can change it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form.AppField name="name">
            {(field) => (
              <field.Input placeholder="My Organization" className="max-w-sm" />
            )}
          </form.AppField>
        </CardContent>
        <CardFooter className="justify-between">
          <Typography variant="muted">Max 32 characters.</Typography>
          <form.SubmitButton size="sm" variant="outline">
            Save Changes
          </form.SubmitButton>
        </CardFooter>
      </Card>
    </Form>
  );
}
