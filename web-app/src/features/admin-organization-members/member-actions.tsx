import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { Mail, MoreHorizontal, Trash, UserRound } from "lucide-react";
import type { OrganizationMember } from "./organization-member-types";

export function MemberActions({
  member,
  onRemove,
}: {
  member: OrganizationMember;
  onRemove: (member: OrganizationMember) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={`mailto:${member.user.email}`}>
            <Mail className="mr-2 size-4" />
            Contact
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/users/$userId" params={{ userId: member.user.id }}>
            <UserRound className="mr-2 size-4" />
            View user
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onRemove(member)}
        >
          <Trash className="mr-2 size-4" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
