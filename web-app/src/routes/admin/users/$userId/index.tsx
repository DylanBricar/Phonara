import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingButton } from "@/features/form/submit-button";
import AvatarUpload from "@/features/images/avatar-upload";
import { fileToBase64 } from "@/lib/file-to-base64";
import { createNoIndexHead } from "@/lib/seo";
import { UserProviders } from "./_components/user-providers";
import { UserSessions } from "./_components/user-sessions";
import { dayjs } from "@/lib/dayjs";
import { authClient } from "@/lib/auth-client";
import { adminUpdateUser } from "@/lib/auth/admin-helpers";
import { redirectAfterAuthSessionChange } from "@/lib/auth/session-transition";
import { unwrapSafePromise } from "@/lib/promises";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useAction, useQuery } from "convex/react";
import {
  ArrowLeft,
  Ban,
  Building2,
  Copy,
  Crown,
  MoreHorizontal,
  UserCog,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { SiteConfig } from "@/site-config";

const userDetailTabParser = parseAsStringLiteral([
  "organizations",
  "providers",
  "sessions",
]);

type UserDetail = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  banned: boolean;
  createdAt: number;
  members: {
    id: string;
    organizationId: string;
    role: string;
    organization: {
      id: string;
      name: string;
      logo: string | null;
    };
  }[];
  accounts: {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessTokenExpiresAt: number | string | null;
    refreshTokenExpiresAt: number | string | null;
    scope: string | null;
    createdAt: number | string;
    updatedAt: number | string;
  }[];
  sessions: {
    id: string;
    userId: string;
    userAgent: string | null;
    ipAddress: string | null;
    impersonatedBy: string | null;
    createdAt: number | string;
    updatedAt: number | string;
    expiresAt: number | string;
  }[];
};

export const Route = createFileRoute("/admin/users/$userId/")({
  head: ({ params }) =>
    createNoIndexHead({
      title: "User Details",
      description: `Manage a ${SiteConfig.title} platform user.`,
      path: `/admin/users/${params.userId}`,
      section: "Admin",
    }),
  component: UserDetailPage,
  pendingComponent: UserDetailSkeleton,
});

function UserDetailSkeleton() {
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
        <Skeleton className="size-9 rounded-md" />
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
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-2 h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
            <CardFooter className="justify-between pt-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-2 h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
            <CardFooter className="justify-between pt-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </CardFooter>
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
        </div>
      </div>
    </div>
  );
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const [tab, setTab] = useQueryState("tab", userDetailTabParser);
  const activeTab = tab ?? "profile";
  const userData = useQuery(api.admin.queries.getUserById, { userId });

  const roleMutation = useQueryMutation({
    mutationFn: async (role: "admin" | "user") => {
      return unwrapSafePromise(authClient.admin.setRole({ userId, role }));
    },
    onSuccess: () => {
      toast.success("User role updated");
    },
    onError: (error) => toastClientError(error, "Failed to update user role"),
  });

  const banMutation = useQueryMutation({
    mutationFn: async () => {
      if (userData?.banned) {
        return unwrapSafePromise(authClient.admin.unbanUser({ userId }));
      }
      return unwrapSafePromise(
        authClient.admin.banUser({
          userId,
          banReason: "Admin initiated ban",
        }),
      );
    },
    onSuccess: () => {
      toast.success(userData?.banned ? "User unbanned" : "User banned");
    },
    onError: (error) => toastClientError(error, "Failed to update user ban status"),
  });

  const impersonateMutation = useQueryMutation({
    mutationFn: async () => {
      return unwrapSafePromise(authClient.admin.impersonateUser({ userId }));
    },
    onSuccess: () => {
      toast.success("Now impersonating user");
      redirectAfterAuthSessionChange("/orgs");
    },
    onError: (error) => toastClientError(error, "Failed to impersonate user"),
  });

  if (userData === undefined) return <UserDetailSkeleton />;
  if (!userData) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-12">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserCog />
            </EmptyMedia>
            <EmptyTitle>User not found</EmptyTitle>
            <EmptyDescription>
              The user may have been deleted or the identifier is invalid.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const user: UserDetail = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    image: userData.image ?? null,
    role: userData.role ?? "user",
    banned: Boolean(userData.banned),
    createdAt: userData.createdAt,
    members: userData.members,
    accounts: userData.accounts,
    sessions: userData.sessions,
  };

  const lastLogin = user.sessions[0]
    ? dayjs(user.sessions[0].createdAt).fromNow()
    : "Never";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-4 pb-8">
      <Link
        to="/admin/users"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Users
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-lg">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{user.name}</h1>
              <Badge variant={user.role === "admin" ? "default" : "outline"}>
                {user.role === "admin" ? "Admin" : "User"}
              </Badge>
              {user.banned && <Badge variant="destructive">Banned</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="User actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!user.banned && (
              <DropdownMenuItem
                onClick={() => impersonateMutation.mutate()}
                disabled={impersonateMutation.isPending}
              >
                <UserCog className="mr-2 size-4" />
                Impersonate
              </DropdownMenuItem>
            )}
            {user.role !== "admin" && (
              <DropdownMenuItem
                onClick={() => roleMutation.mutate("admin")}
                disabled={roleMutation.isPending}
              >
                <Crown className="mr-2 size-4" />
                Promote to Admin
              </DropdownMenuItem>
            )}
            {user.role === "admin" && (
              <DropdownMenuItem
                onClick={() => roleMutation.mutate("user")}
                disabled={roleMutation.isPending}
              >
                <UserCog className="mr-2 size-4" />
                Set as Regular User
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => banMutation.mutate()}
              disabled={banMutation.isPending}
              className={user.banned ? "text-primary" : "text-destructive"}
            >
              <Ban className="mr-2 size-4" />
              {user.banned ? "Unban User" : "Ban User"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          void setTab(
            value === "organizations" ||
              value === "providers" ||
              value === "sessions"
              ? value
              : null,
          );
        }}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col items-start gap-8 lg:flex-row">
          <div className="min-w-0 flex-1 px-px pb-px">
            <TabsContent value="profile" className="mt-0 flex flex-col gap-6">
              <AdminAvatarCard userId={user.id} defaultImage={user.image} />
              <NameCard userId={user.id} defaultName={user.name} />
              <EmailCard userId={user.id} defaultEmail={user.email} />
            </TabsContent>

            <TabsContent value="organizations" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>
                    Organizations this user belongs to.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.members.length === 0 ? (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>No organizations</EmptyTitle>
                        <EmptyDescription>
                          This user is not a member of any organization yet.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <Link
                                  to="/admin/organizations/$orgId"
                                  params={{ orgId: member.organizationId }}
                                  className="flex items-center gap-3"
                                >
                                  <Avatar className="size-8 rounded-lg">
                                    {member.organization.logo ? (
                                      <AvatarImage
                                        src={member.organization.logo}
                                        alt={member.organization.name}
                                      />
                                    ) : null}
                                    <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
                                      {member.organization.name
                                        .charAt(0)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">
                                      {member.organization.name}
                                    </div>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{member.role}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      aria-label={`Actions for ${member.organization.name}`}
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link
                                        to="/admin/organizations/$orgId"
                                        params={{
                                          orgId: member.organizationId,
                                        }}
                                      >
                                        <Building2 className="mr-2 size-4" />
                                        Open organization
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={async () => {
                                        await navigator.clipboard.writeText(
                                          member.organizationId,
                                        );
                                        toast.success(
                                          "Organization ID copied",
                                        );
                                      }}
                                    >
                                      <Copy className="mr-2 size-4" />
                                      Copy organization ID
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="providers" className="mt-0">
              <UserProviders userId={user.id} accounts={user.accounts} />
            </TabsContent>

            <TabsContent value="sessions" className="mt-0">
              <UserSessions userId={user.id} />
            </TabsContent>
          </div>

          <div className="w-full shrink-0 lg:w-60">
            <div className="sticky top-6 flex flex-col gap-5">
              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  User ID
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <code className="truncate font-mono text-sm">
                    {user.id.slice(0, 8)}...{user.id.slice(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      void navigator.clipboard.writeText(user.id);
                      toast.success("User ID copied");
                    }}
                    aria-label="Copy user ID"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Created
                </p>
                <p className="mt-1 text-sm font-medium">
                  {dayjs(user.createdAt).format("MMMM D, YYYY")}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-xs tracking-wider uppercase">
                  Last Login
                </p>
                <p className="mt-1 text-sm font-medium">{lastLogin}</p>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function AdminAvatarCard({
  userId,
  defaultImage,
}: {
  userId: string;
  defaultImage: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImage);
  const uploadUserImage = useAction(api.files.actions.uploadUserImage);

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
      toastClientError(error, "Failed to set password");
    },
  });

  const saveAvatarMutation = useQueryMutation({
    mutationFn: async () => {
      return adminUpdateUser(userId, { image: imageUrl });
    },
    onSuccess: () => {
      toast.success("Avatar updated");
    },
    onError: (error: Error) => toastClientError(error, "Failed to upload avatar"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1.5">
          <CardTitle>Avatar</CardTitle>
          <CardDescription>
            Click the avatar to upload a new image.
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
          onClick={() => saveAvatarMutation.mutate()}
          loading={saveAvatarMutation.isPending}
        >
          Save
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

function NameCard({
  userId,
  defaultName,
}: {
  userId: string;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);

  const mutation = useQueryMutation({
    mutationFn: async () => {
      return adminUpdateUser(userId, { name });
    },
    onSuccess: () => {
      toast.success("Name updated");
    },
    onError: (error: Error) => toastClientError(error, "Failed to update name"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>The user display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-sm"
          placeholder="User name"
        />
      </CardContent>
      <CardFooter className="justify-between">
        <Typography variant="muted">Max 32 characters.</Typography>
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={name === defaultName}
        >
          Save
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

function EmailCard({
  userId,
  defaultEmail,
}: {
  userId: string;
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail);

  const mutation = useQueryMutation({
    mutationFn: async () => {
      return adminUpdateUser(userId, { email });
    },
    onSuccess: () => {
      toast.success("Email updated");
    },
    onError: (error: Error) => toastClientError(error, "Failed to update email"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>The user primary email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="max-w-sm"
          placeholder="user@example.com"
        />
      </CardContent>
      <CardFooter className="justify-between">
        <Typography variant="muted">Must be a valid email.</Typography>
        <LoadingButton
          size="sm"
          variant="outline"
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={email === defaultEmail}
        >
          Save
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}
