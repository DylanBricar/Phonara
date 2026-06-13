import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

type NavItem = {
  href: string;
  label: string;
};

type ContentNavProps = {
  navItems: NavItem[];
};

export function ContentNav({ navItems }: ContentNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className="hidden items-center gap-3 md:flex">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "text-[13px] transition-colors",
              isActive
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
