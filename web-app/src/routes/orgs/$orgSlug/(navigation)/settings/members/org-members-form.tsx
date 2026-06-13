import { Loader } from "@/components/nowts/loader";
import { Typography } from "@/components/nowts/typography";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineTooltip } from "@/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { openGlobalDialog } from "@/features/global-dialog/global-dialog.store";
type Invitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  organizationId: string;
  expiresAt: Date;
  inviterId: string;
  createdAt: Date;
};
import { useSession } from "@/lib/auth-client";
import type { AssignableAuthRole } from "@/lib/auth/auth-permissions";
import { AssignableRolesKeys, getRoleLabel } from "@/lib/auth/auth-permissions";
import { cn } from "@/lib/utils";
import type { OrgMembers } from "@/query/org/get-orgs-members";
import { api } from "@convex/_generated/api";
import { Copy, MailPlus, MoreVertical, Trash, Zap } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMutation as useConvexMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { OrganizationInviteMemberForm } from "./org-invite-member-form";

const membersTabParser = parseAsStringLiteral(["invitation"]);

type OrgMembersFormProps = {
  members: OrgMembers;
  maxMembers: number;
  invitations: Invitation[];
};

export const OrgMembersForm = ({
  maxMembers,

  members,
  invitations,
}: OrgMembersFormProps) => {
  const session = useSession();
  const org = useCurrentOrg();
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status !== "accepted",
  );
  const [tab, setTab] = useQueryState("tab", membersTabParser);
  const activeTab = tab ?? "members";

  const updateMemberRole = useConvexMutation(
    api.auth.mutations.updateMemberRole,
  );
  const removeMember = useConvexMutation(api.auth.mutations.removeMember);
  const cancelInvitation = useConvexMutation(
    api.auth.mutations.cancelInvitation,
  );
  const [cancelingInvitationId, setCancelingInvitationId] = useState<
    string | null
  >(null);

  const handleUpdateMemberRole = async (
    memberId: string,
    role: AssignableAuthRole,
  ) => {
    if (!org?.id) {
      toast.error("Organization ID is required");
      return;
    }

    try {
      await updateMemberRole({
        memberId,
        role,
        organizationId: org.id,
      });
    } catch (error) {
      toastClientError(error, "Failed to update role");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!org?.id) {
      toast.error("Organization ID is required");
      return;
    }

    setCancelingInvitationId(invitationId);

    try {
      await cancelInvitation({
        invitationId,
        organizationId: org.id,
      });
      toast.success("Invitation removed successfully");
    } catch {
      toast.error("Failed to remove invitation");
    } finally {
      setCancelingInvitationId(null);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    dialogManager.confirm({
      title: "Remove member",
      description:
        "Are you sure you want to remove this member from the organization?",
      action: {
        label: "Remove",
        onClick: async () => {
          if (!org?.id) {
            toast.error("Organization ID is required");
            return;
          }
          try {
            await removeMember({
              memberIdOrEmail: memberId,
              organizationId: org.id,
            });
            toast.success("Member removed successfully");
          } catch {
            toast.error("Failed to remove member");
          }
        },
      },
    });
  };

  const openInvitationsTab = () => {
    void setTab("invitation");
  };

  return (
    <Card>
      <CardHeader className="flex w-full flex-col gap-4 space-y-0 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Teammates that have access to this workspace.
          </CardDescription>
        </div>
        <div className="flex-1"></div>
        <div className="shrink-0">
          {members.length < maxMembers ? (
            <OrganizationInviteMemberForm onInviteSent={openInvitationsTab} />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                const dialogId = dialogManager.confirm({
                  title: "Oh no! You've reached the maximum number of members",
                  description: (
                    <>
                      <Typography>
                        You can't add more members to your organization. Please
                        upgrade your plan to add more members.
                      </Typography>
                      <Alert className="flex flex-col gap-2">
                        <Progress value={(members.length / maxMembers) * 100} />
                        <Typography variant="small">
                          You have {members.length} members out of {maxMembers}{" "}
                          members
                        </Typography>
                      </Alert>
                    </>
                  ),
                  action: {
                    label: "Upgrade your plan",
                    onClick: () => {
                      openGlobalDialog("org-plan");
                      dialogManager.close(dialogId);
                    },
                  },
                });
              }}
            >
              <Zap className="mr-2" size={16} />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          void setTab(value === "invitation" ? "invitation" : null);
        }}
        className="mt-4 gap-0"
      >
        <div className="px-6">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitation">Invitations</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="members" className="mt-4 border-t pt-2">
          <CardContent className="flex flex-col">
            {members.map((member) => {
              const isCurrentUser = member.user.id === session.data?.user.id;
              return (
                <div key={member.id}>
                  <div className="my-2 flex flex-wrap items-center gap-2">
                    <Avatar className="shrink-0">
                      <AvatarFallback>
                        {member.user.email.slice(0, 2)}
                      </AvatarFallback>
                      {member.user.image ? (
                        <AvatarImage src={member.user.image} />
                      ) : null}
                    </Avatar>
                    <div className="min-w-0">
                      <Typography className="truncate text-sm font-medium">
                        {member.user.name}
                      </Typography>
                      <Typography variant="muted" className="truncate">
                        {member.user.email}
                      </Typography>
                    </div>
                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2">
                      {member.role.includes("owner") ? (
                        <InlineTooltip title="You can't change the role of an owner">
                          <Typography variant="muted">Owner</Typography>
                        </InlineTooltip>
                      ) : (
                        <Select
                          disabled={isCurrentUser}
                          value={member.role}
                          onValueChange={(value) => {
                            if (value === "owner" || value === member.role)
                              return;
                            void handleUpdateMemberRole(
                              member.id,
                              value as AssignableAuthRole,
                            );
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select role">
                              {(value) => getRoleLabel(value)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {AssignableRolesKeys.map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={async () =>
                              navigator.clipboard.writeText(member.id)
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Copy member ID
                          </DropdownMenuItem>
                          {isCurrentUser ||
                          member.role.includes("owner") ? null : (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={member.role.includes("OWNER")}
                              >
                                <Trash className="mr-2 size-4" />
                                Delete member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </TabsContent>
        <TabsContent value="invitation" className="mt-4 border-t pt-2">
          <CardContent className="flex flex-col">
            {pendingInvitations.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MailPlus />
                  </EmptyMedia>
                  <EmptyTitle>No pending invitations</EmptyTitle>
                  <EmptyDescription>
                    Invite teammates to collaborate in this workspace. Their
                    pending invitations will appear here.
                  </EmptyDescription>
                </EmptyHeader>
                {members.length < maxMembers ? (
                  <EmptyContent>
                    <OrganizationInviteMemberForm
                      onInviteSent={openInvitationsTab}
                    />
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : (
              <>
                {pendingInvitations.map((invitation) => {
                  const isExpired = new Date(invitation.expiresAt) < new Date();
                  const isCanceled =
                    invitation.status === "canceled" || isExpired;
                  return (
                    <div key={invitation.id}>
                      <div className="my-2 flex flex-wrap items-center gap-2">
                        <Avatar className="shrink-0">
                          <AvatarFallback>
                            {invitation.email.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 items-center gap-2">
                          <Typography
                            className={cn("truncate text-sm font-medium", {
                              "text-muted-foreground line-through": isCanceled,
                            })}
                          >
                            {invitation.email}
                          </Typography>

                          {isExpired ? (
                            <Badge variant="outline" className="shrink-0">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">
                              {invitation.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-2">
                          <Typography variant="muted">
                            {invitation.role}
                          </Typography>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={async () =>
                                  navigator.clipboard.writeText(invitation.id)
                                }
                              >
                                <Copy className="mr-2 size-4" />
                                Copy invitation ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  void handleCancelInvitation(invitation.id);
                                }}
                                disabled={
                                  cancelingInvitationId === invitation.id
                                }
                              >
                                {cancelingInvitationId === invitation.id ? (
                                  <Loader className="mr-2 size-4" />
                                ) : (
                                  <Trash className="mr-2 size-4" />
                                )}
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
