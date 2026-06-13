import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { AlertCircle, Shield, User2 } from "lucide-react";

export const getAccountNavigation = (): NavigationGroup[] => {
  return ACCOUNT_LINKS;
};

const ACCOUNT_LINKS: NavigationGroup[] = [
  {
    title: "Your profile",
    links: [
      {
        href: "/account",
        Icon: User2,
        label: "Profile",
      },
      {
        href: "/account/security",
        Icon: Shield,
        label: "Security",
      },
      {
        href: "/account/danger",
        Icon: AlertCircle,
        label: "Danger",
      },
    ],
  },
];
