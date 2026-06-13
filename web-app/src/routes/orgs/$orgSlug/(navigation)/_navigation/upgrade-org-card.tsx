import { buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useCurrentOrg } from "@/hooks/use-current-org";

export const UpgradeCard = () => {
  const org = useCurrentOrg();

  if (!org) return null;

  if (org.subscription) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5 shadow-sm">
      <p className="text-muted-foreground text-xs">Unlock all features</p>
      <Link
        to="/orgs/$orgSlug/settings/billing"
        params={{ orgSlug: org.slug }}
        className={buttonVariants({ size: "sm", className: "h-7 text-xs" })}
      >
        Upgrade
      </Link>
    </div>
  );
};
