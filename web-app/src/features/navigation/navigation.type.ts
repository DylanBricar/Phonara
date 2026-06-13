import type { AuthRole } from "@/lib/auth/auth-permissions";
import type { LucideIcon } from "lucide-react";

export type NavigationGroup = {
  title: string;
  roles?: AuthRole[];
  links: NavigationLink[];
  defaultOpenStartPath?: string;
};

type NavigationLink = {
  href: string;
  Icon: LucideIcon;
  label: string;
  roles?: AuthRole[];
  hidden?: boolean;
  links?: NavigationLink[];
};
