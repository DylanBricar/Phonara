import { LogoSvg } from "@/components/svg/logo-svg";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";
import { AuthButtonClient } from "../auth/auth-button-client";

export function LandingHeader() {
  return (
    <header className="landing-header fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#141414]/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[#fafafa] transition-colors hover:text-white"
        >
          <LogoSvg size={22} />
          <span className="text-lg font-semibold uppercase max-sm:hidden">
            {SiteConfig.title}
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <div className="hidden items-center gap-8 text-[13px] font-medium text-[#888] md:flex">
            <Link
              to="/"
              hash="features"
              className="transition-colors hover:text-[#fafafa]"
            >
              Features
            </Link>
            <Link
              to="/"
              hash="faq"
              className="transition-colors hover:text-[#fafafa]"
            >
              FAQ
            </Link>
            <Link
              to="/posts"
              className="transition-colors hover:text-[#fafafa]"
            >
              Blog
            </Link>
          </div>
          <AuthButtonClient contentClassName="dark" hideTheme />
        </nav>
      </div>
    </header>
  );
}
