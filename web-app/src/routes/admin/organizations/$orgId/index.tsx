import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingButton } from "@/features/form/submit-button";
import AvatarUpload from "@/features/images/avatar-upload";
import { fileToBase64 } from "@/lib/file-to-base64";
import { createNoIndexHead } from "@/lib/seo";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import type { Subscription } from "@/lib/auth/stripe/auth-plans";
import { OrganizationMembers } from "@/features/admin-organization-members/organization-members";
import { OrganizationOverrideLimits } from "./_components/organization-override-limits";
import { OrganizationPayments } from "./_components/organization-payments";
import { OrganizationSubscription } from "./_components/organization-subscription";
import { LinkStripeCustomer } from "./_components/link-stripe-customer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import {
  useAction,
  useMutation as useConvexMutation,
  useQuery,
} from "convex/react";
import { ArrowLeft, Copy, ExternalLink, Users } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { SiteConfig } from "@/site-config";

const STRIPE_CUSTOMER_URL = "https://dashboard.stripe.com/customers";
const organizationDetailTabParser = parseAsStringLiteral([
  "members",
  "billing",
  "settings",
]);
const organizationBillingCycleParser = parseAsStringLiteral([
  "monthly",
  "yearly",
]);

type OrgMember = {
  id: string;
  role: string;
  createdAt: number;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

type OrgInvitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  organizationId: string;
  inviterId: string;
  expiresAt: number;
  createdAt: number;
};

type OrgData = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: number;
  stripeCustomerId: string | null;
  members: OrgMember[];
  invitations: OrgInvitation[];
  subscription: Subscription | null;
};

function OrgDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 pb-8">
      <Skeleton className="h-4 w-16" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      <div className="flex items-start gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-64" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex w-60 shrink-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgNameCard({
  organizationId,
  defaultName,
}: {
  organizationId: string;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const updateOrganization = useConvexMutation(
    api.admin.mutations.updateOrganization,
  );

  const handleSaveName = async () => {
    setIsSaving(true);

    try {
      await updateOrganization({
        organizationId,
        data: { name },
      });
      toast.success("Organization name updated");
    } catch (error) {
      toastClientError(error, "Failed to update organization");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Name</CardTitle>
        <CardDescription>
          The display name of this organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-sm"
          placeholder="Organization name"
        />
      </CardContent>
      <CardFooter className="justify-between">
        <Typography variant="muted">Max 32 characters.</Typography>
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={() => void handleSaveName()}
          loading={isSaving}
          disabled={name === defaultName}
        >
          Save
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

function OrgAvatarCard({
  organizationId,
  defaultImage,
}: {
  organizationId: string;
  defaultImage: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImage);
  const [isSaving, setIsSaving] = useState(false);
  const uploadUserImage = useAction(api.files.actions.uploadUserImage);
  const updateOrganization = useConvexMutation(
    api.admin.mutations.updateOrganization,
  );

  const uploadImageMutation = useQueryMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file);
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
      toastClientError(error, "Failed to create Stripe customer");
    },
  });

  const handleSaveLogo = async () => {
    setIsSaving(true);

    try {
      await updateOrganization({
        organizationId,
        data: { logo: imageUrl },
      });
      toast.success("Logo updated");
    } catch (error) {
      toastClientError(error, "Failed to update logo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1.5">
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Click the logo to upload a new image.
          </CardDescription>
        </div>
        <CardAction>
          <AvatarUpload
            onChange={(file) => uploadImageMutation.mutate(file)}
            onRemove={() => setImageUrl(null)}
            initialFile={imageUrl ?? undefined}
            isPending={uploadImageMutation.isPending}
          />
        </CardAction>
      </CardHeader>
      <CardFooter className="justify-between">
        <Typography variant="muted">
          Square image recommended. Max file size: 2MB.
        </Typography>
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={() => void handleSaveLogo()}
          loading={isSaving}
        >
          Save
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

export const Route = createFileRoute("/admin/organizations/$orgId/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "Organization Details",
      description: `Manage a ${SiteConfig.title} platform organization.`,
      path: `/admin/organizations/${params.orgId}`,
      section: "Admin",
    }),
  component: OrgDetailPage,
  pendingComponent: OrgDetailSkeleton,
});

function OrgDetailPage() {
  const { orgId } = Route.useParams();
  const [tab, setTab] = useQueryState("tab", organizationDetailTabParser);
  const [, setBillingCycle] = useQueryState(
    "billingCycle",
    organizationBillingCycleParser,
  );
  const activeTab = tab ?? "profile";
  const orgData = useQuery(api.admin.queries.getOrganizationById, {
    organizationId: orgId,
  });
  const subscription = useQuery(
    api.subscriptions.queries.getByOrganization,
    orgData ? { organizationId: orgId } : "skip",
  );

  if (orgData === undefined) return <OrgDetailSkeleton />;
  if (!orgData) return <div>Organization not found</div>;

  const org: OrgData = {
    id: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    logo: orgData.logo,
    createdAt: orgData.createdAt,
    stripeCustomerId: orgData.stripeCustomerId,
    members: orgData.members,
    invitations: orgData.invitations,
    subscription: subscription
      ? ({
          id: subscription._id,
          referenceId: orgId,
          plan: subscription.plan,
          organizationId: orgId,
          stripeCustomerId: subscription.stripeCustomerId ?? null,
          stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
          status: subscription.status ?? null,
          periodStart: subscription.periodStart ?? null,
          periodEnd: subscription.periodEnd ?? null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? null,
          seats: subscription.seats ?? null,
          discount: subscription.discount ?? null,
          overrideLimits: subscription.overrideLimits ?? null,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        } satisfies Subscription)
      : null,
  };

  const creatorEmail = org.members[0]?.user.email ?? "Unknown";

  const handleCopy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const orgForSubscription = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    createdAt: new Date(org.createdAt),
    metadata: null,
    stripeCustomerId: org.stripeCustomerId,
    email: null,
    subscription: org.subscription,
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 pb-8">
      <Link
        to="/admin/organizations"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Organizations
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-lg">
            <AvatarImage src={org.logo ?? undefined} alt={org.name} />
            <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
              {org.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{org.name}</h1>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Users className="size-4" />
              {org.members.length}{" "}
              {org.members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {org.stripeCustomerId && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`${STRIPE_CUSTOMER_URL}/${org.stripeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="size-4" />
              Stripe
            </a>
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value !== "billing") {
            void setBillingCycle(null);
          }

          void setTab(
            value === "members" || value === "billing" || value === "settings"
              ? value
              : null,
          );
        }}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col items-start gap-8 lg:flex-row">
          <div className="min-w-0 flex-1 px-px pb-px">
            <TabsContent value="profile" className="mt-0 flex flex-col gap-6">
              <OrgAvatarCard organizationId={org.id} defaultImage={org.logo} />
              <OrgNameCard organizationId={org.id} defaultName={org.name} />
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <OrganizationMembers
                organizationId={org.id}
                members={org.members.map((m) => ({
                  ...m,
                  createdAt: new Date(m.createdAt),
                }))}
                invitations={org.invitations}
              />
            </TabsContent>

            <TabsContent value="billing" className="mt-0 space-y-6">
              <OrganizationSubscription
                organization={orgForSubscription}
                subscription={org.subscription}
              />
              <OrganizationPayments
                organizationId={org.id}
                subscription={org.subscription}
                paymentMethod={null}
                stripeCustomerId={org.stripeCustomerId}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              <OrganizationOverrideLimits
                subscription={org.subscription}
                organizationId={org.id}
              />
              {org.stripeCustomerId ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe</CardTitle>
                    <CardDescription>
                      Connected customer record for this organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`${STRIPE_CUSTOMER_URL}/${org.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="size-4" />
                        View Stripe Customer
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Stripe</CardTitle>
                    <CardDescription>
                      Create a Stripe customer before managing paid billing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LinkStripeCustomer organizationId={org.id} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>

          <div className="w-full shrink-0 lg:w-60">
            <div className="sticky top-6 flex flex-col gap-5">
              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Org ID
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <code className="truncate font-mono text-sm">
                    {org.id.slice(0, 8)}...{org.id.slice(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => void handleCopy(org.id, "Organization ID")}
                    aria-label="Copy organization ID"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Created by
                </p>
                <p className="mt-1 text-sm">{creatorEmail}</p>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Members
                </p>
                <p className="mt-1 text-sm font-medium">{org.members.length}</p>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Created
                </p>
                <p className="mt-1 text-sm font-medium">
                  {dayjs(org.createdAt).format("MMMM D, YYYY")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
