import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import type { OrganizationMember } from "./organization-member-types";

export function MemberIdentityLink({
  member,
}: {
  member: OrganizationMember;
}) {
  return (
    <Link
      to="/admin/users/$userId"
      params={{ userId: member.user.id }}
      className="flex items-center gap-3"
    >
      <Avatar className="size-8">
        {member.user.image ? <AvatarImage src={member.user.image} /> : null}
        <AvatarFallback>{member.user.name.charAt(0) || "U"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium">{member.user.name}</div>
        <div className="text-muted-foreground truncate text-sm">
          {member.user.email}
        </div>
      </div>
    </Link>
  );
}
