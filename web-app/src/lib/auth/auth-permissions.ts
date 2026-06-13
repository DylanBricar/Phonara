import type { Statements } from "better-auth/plugins/access";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";
import { z } from "zod";

const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete"],
  subscription: ["manage"],
  users: ["create", "delete"],
  apiKey: ["create", "read", "update", "delete"],
} as const satisfies Statements;

export const AuthPermissionSchema = z.object(
  Object.fromEntries(
    Object.entries(statement).map(([key, actions]) => [
      key,
      z.array(z.enum([...actions] as [string, ...string[]])).optional(),
    ]),
  ),
) as z.ZodType<{
  [K in keyof typeof statement]?: (typeof statement)[K][number][];
}>;

export type AuthPermission = z.infer<typeof AuthPermissionSchema>;

export const ac = createAccessControl(statement);

const member = ac.newRole({
  project: ["create"],
  users: ["create"],
  apiKey: ["read"],
  ...memberAc.statements,
});

const admin = ac.newRole({
  project: ["create", "update"],
  subscription: ["manage"],
  users: ["create", "delete"],
  apiKey: ["create", "read", "update", "delete"],
  ...adminAc.statements,
});

const owner = ac.newRole({
  ...(statement as Statements),
  ...ownerAc.statements,
});

export const roles = { member, admin, owner } as const;

export const RolesKeys = ["member", "admin", "owner"] as const;

export type AuthRole = keyof typeof roles;

export const AssignableRolesKeys = ["member", "admin"] as const;

export type AssignableAuthRole = (typeof AssignableRolesKeys)[number];

const RoleLabels = {
  member: "Member",
  admin: "Admin",
  owner: "Owner",
} as const satisfies Record<AuthRole, string>;

export function getRoleLabel(role: string | null | undefined) {
  if (!role) return "";
  if (role === "member" || role === "admin" || role === "owner") {
    return RoleLabels[role];
  }
  return role;
}
