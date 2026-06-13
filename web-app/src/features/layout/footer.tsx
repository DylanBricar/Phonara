import { LogoSvg } from "@/components/svg/logo-svg";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[#222] bg-[#0a0a0a]">
      <div className="mx-auto w-full max-w-6xl px-6 pt-20 pb-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Link to="/" className="flex items-center gap-2 text-[#fafafa]">
              <LogoSvg size={28} />
              <span className="font-elegant text-2xl tracking-tight">
                {SiteConfig.title}
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[#888]">
              {SiteConfig.description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <a
                href={SiteConfig.team.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="group flex size-9 items-center justify-center rounded-full border border-[#222] text-[#888] transition-all hover:border-[#444] hover:bg-[#141414] hover:text-[#fafafa]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={SiteConfig.team.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                className="group flex h-9 items-center gap-1.5 rounded-full border border-[#222] px-3 text-xs font-medium text-[#888] transition-all hover:border-[#444] hover:bg-[#141414] hover:text-[#fafafa]"
              >
                {SiteConfig.team.name}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>

          <FooterColumn title="Product">
            <FooterLink to="/" hash="features">
              Features
            </FooterLink>
            <FooterLink to="/" hash="pricing">
              Pricing
            </FooterLink>
            <FooterLink to="/docs">Documentation</FooterLink>
            <FooterLink to="/posts">Blog</FooterLink>
          </FooterColumn>

          <FooterColumn title="Account">
            <FooterLink to="/orgs">Dashboard</FooterLink>
            <FooterLink to="/account">Settings</FooterLink>
            <FooterLink to="/auth/signin">Sign in</FooterLink>
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLink to="/legal/terms">Terms of Service</FooterLink>
            <FooterLink to="/legal/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-[#1a1a1a] pt-8 text-xs text-[#555] md:flex-row md:items-center">
          <p>
            &copy; {year} {SiteConfig.company.name}. All rights reserved.
          </p>
          <p>{SiteConfig.company.address}</p>
        </div>

        <div
          aria-hidden="true"
          className="font-elegant pointer-events-none mt-8 w-full bg-gradient-to-b from-[#fafafa]/[0.08] to-transparent bg-clip-text text-center text-[clamp(4rem,22vw,18rem)] leading-none tracking-tight text-transparent select-none"
        >
          {SiteConfig.title}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-xs font-semibold tracking-wider text-[#fafafa] uppercase">
        {title}
      </h4>
      <nav className="flex flex-col gap-2.5">{children}</nav>
    </div>
  );
}

function FooterLink({
  to,
  hash,
  children,
}: {
  to: string;
  hash?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className="group inline-flex w-fit items-center gap-1 text-sm text-[#888] transition-colors hover:text-[#fafafa]"
    >
      {children}
    </Link>
  );
}
