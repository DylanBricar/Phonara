import { SiteConfig } from "@/site-config";
import { Image } from "@unpic/react";
import { Link } from "@tanstack/react-router";
import { AuthButton } from "../auth/auth-button";
import { ContentNav } from "./content-nav";
import { ContentSearch } from "./content-search";
import { MobileNav } from "./mobile-nav";

const navItems = [
  { href: "/docs", label: "Docs" },
  { href: "/posts", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
];

export function ContentHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="flex h-12 items-center justify-between px-4 md:px-5">
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2">
            <Image
              src={SiteConfig.appIcon}
              alt={SiteConfig.title}
              width={20}
              height={20}
              className="size-5"
            />
            <span className="text-[13px] font-semibold">
              {SiteConfig.title}
            </span>
          </Link>
          <span className="bg-border hidden h-4 w-px md:block" />
          <ContentNav navItems={navItems} />
        </div>

        <div className="flex items-center gap-2">
          <ContentSearch />
          <div className="hidden md:block">
            <AuthButton />
          </div>
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
