import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";

export const COMMAND_ICONS: Record<string, LucideIcon> = {
  member: Users,
} as const;
