import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineTooltip } from "@/components/ui/tooltip";
import { LoadingButton } from "@/features/form/submit-button";
import { Form, useForm } from "@/features/form/tanstack-form";
import AvatarUpload from "@/features/images/avatar-upload";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { api } from "@convex/_generated/api";
import type { User } from "better-auth";
import { useAction } from "convex/react";
import { BadgeCheck, Check, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { z } from "zod";

type AccountCardProps = {
  user: User;
};

export function NameCard({ user }: AccountCardProps) {
  const form = useForm({
    schema: z.object({ name: z.string().min(1, "Name is required") }),
    defaultValues: { name: user.name },
    onSubmit: async (values) => {
      await unwrapSafePromise(authClient.updateUser({ name: values.name }));
      toast.success("Name updated");
    },
  });

  return (
    <Form form={form}>
      <Card>
        <CardHeader>
          <CardTitle>Your Name</CardTitle>
          <CardDescription>This is your display name on Nowts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form.AppField name="name">
            {(field) => (
              <field.Input placeholder="Your name" className="max-w-sm" />
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

export function EmailCard({ user }: AccountCardProps) {
  const verifyEmailMutation = useQueryMutation({
    mutationFn: async () => {
      return unwrapSafePromise(
        authClient.sendVerificationEmail({ email: user.email }),
      );
    },
    onSuccess: () => {
      toast.success("Verification email sent");
    },
    onError: (error) => {
      toastClientError(error, "Failed to send verification email");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Email</CardTitle>
        <CardDescription>
          This will be the email you use to log in and receive notifications. A
          confirmation is required for changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input value={user.email} readOnly className="max-w-sm" />
          {user.emailVerified ? (
            <InlineTooltip title="Email verified">
              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-xs">
                <BadgeCheck size={12} />
                Verified
              </Badge>
            </InlineTooltip>
          ) : (
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-xs"
              onClick={() => verifyEmailMutation.mutate()}
              loading={verifyEmailMutation.isPending}
            >
              Verify email
            </LoadingButton>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          className={buttonVariants({ size: "sm", variant: "outline" })}
          to="/account/change-email"
        >
          Change email
        </Link>
      </CardFooter>
    </Card>
  );
}

export function AvatarCard({ user }: AccountCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(user.image ?? null);
  const uploadUserImage = useAction(api.files.actions.uploadUserImage);

  const uploadImageMutation = useQueryMutation({
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
      return uploadUserImage({
        base64,
        fileName: file.name,
        mimeType: file.type,
      });
    },
    onSuccess: (data) => {
      setImageUrl(data);
    },
    onError: (error) => {
      toastClientError(error, "Failed to delete account");
    },
  });

  const saveAvatarMutation = useQueryMutation({
    mutationFn: async () => {
      return unwrapSafePromise(authClient.updateUser({ image: imageUrl }));
    },
    onSuccess: () => {
      toast.success("Avatar updated");
    },
    onError: (error) => {
      toastClientError(error, "Failed to upload avatar");
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Your Avatar</CardTitle>
          <CardDescription>
            Click your avatar to upload a new image.
          </CardDescription>
        </div>
        <AvatarUpload
          onChange={(file) => uploadImageMutation.mutate(file)}
          onRemove={() => setImageUrl(null)}
          initialFile={imageUrl ?? undefined}
          isPending={uploadImageMutation.isPending}
        />
      </CardHeader>
      <CardFooter className="justify-between">
        <Typography variant="muted">
          Square image recommended. Accepted file types: .png, .jpg. Max file
          size: 2MB.
        </Typography>
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={() => saveAvatarMutation.mutate()}
          loading={saveAvatarMutation.isPending}
        >
          Save changes
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

export function UserIdCard({ user }: AccountCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your User ID</CardTitle>
        <CardDescription>
          This is your unique account identifier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative max-w-sm">
          <Input value={user.id} readOnly className="pr-10" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
            onClick={copyToClipboard}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Typography variant="muted">
          This may be used to identify your account in the API.
        </Typography>
      </CardFooter>
    </Card>
  );
}
