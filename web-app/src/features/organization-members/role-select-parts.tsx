import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoleLabel, type AuthRole } from "@/lib/auth/auth-permissions";

export function RoleSelectParts({
  roles,
  triggerClassName = "w-full",
}: {
  roles: readonly AuthRole[];
  triggerClassName?: string;
}) {
  return (
    <>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Select role">
          {(value) => getRoleLabel(value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {getRoleLabel(role)}
          </SelectItem>
        ))}
      </SelectContent>
    </>
  );
}
