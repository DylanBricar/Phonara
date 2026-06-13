import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, useForm } from "@/features/form/tanstack-form";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/navigation/open-external-url";
import { api } from "@convex/_generated/api";
import { useRouter } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { z } from "zod";

const CANCEL_REASONS = {
  too_expensive: "Too expensive",
  not_using: "Not using the product enough",
  missing_features: "Missing features",
  bugs: "Too many bugs/issues",
  competitor: "Switching to a competitor",
  other: "Other",
} as const;

const CancelSchema = z.object({
  reasonType: z.enum([
    "too_expensive",
    "not_using",
    "missing_features",
    "bugs",
    "competitor",
    "other",
  ] as const),
  details: z
    .string()
    .min(10, "Please provide more details (minimum 10 characters)"),
});

export function CancelSubscriptionForm({
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const createBillingPortal = useAction(
    api.stripe.actions.createOrganizationBillingPortal,
  );

  const cancelSubscription = async () => {
    setIsPending(true);
    try {
      const result = await createBillingPortal({
        organizationSlug: orgSlug,
        returnUrl: `/orgs/${orgSlug}/settings/billing`,
      });
      if (result.url) {
        toast.success(
          "Redirecting to billing portal where you can cancel your subscription.",
        );
        openExternalUrl(result.url);
      }
    } catch (error) {
      toastClientError(error, "Failed to open billing portal");
    } finally {
      setIsPending(false);
    }
  };

  const form = useForm({
    schema: CancelSchema,
    defaultValues: {
      reasonType: "other" as const,
      details: "",
    },
    onSubmit: async () => {
      await cancelSubscription();
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cancel Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <Form form={form}>
          <div className="flex flex-col gap-6">
            <form.AppField name="reasonType">
              {(field) => (
                <field.Field>
                  <field.Label>
                    What's your main reason for cancelling?
                  </field.Label>
                  <field.Content>
                    <RadioGroup
                      name={field.name}
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(
                          value as
                            | "too_expensive"
                            | "not_using"
                            | "missing_features"
                            | "bugs"
                            | "competitor"
                            | "other",
                        )
                      }
                      className="gap-2"
                    >
                      {Object.entries(CANCEL_REASONS).map(([value, label]) => (
                        <div key={value} className="flex items-center gap-3">
                          <RadioGroupItem value={value} />
                          <label className="cursor-pointer text-sm font-normal">
                            {label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                    <field.Message />
                  </field.Content>
                </field.Field>
              )}
            </form.AppField>

            <form.AppField name="details">
              {(field) => (
                <field.Field>
                  <field.Label>Additional details</field.Label>
                  <field.Content>
                    <field.Textarea
                      placeholder="Please provide more details to help us improve..."
                      className="min-h-[100px]"
                    />
                    <field.Message />
                  </field.Content>
                </field.Field>
              )}
            </form.AppField>

            <div className="flex gap-4">
              <form.SubmitButton variant="destructive" disabled={isPending}>
                Confirm Cancellation
              </form.SubmitButton>
              <Button
                type="button"
                variant="outline"
                onClick={async () =>
                  router.navigate({
                    to: `/orgs/${orgSlug}/settings/billing`,
                  })
                }
              >
                Go Back
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
