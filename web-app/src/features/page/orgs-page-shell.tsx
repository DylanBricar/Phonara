import { LogoSvg } from "@/components/svg/logo-svg";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";

export function OrgsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <OrgsPageHeader />
      <main className="flex-1 py-10">{children}</main>
      <OrgsPageFooter />
    </div>
  );
}

function OrgsPageHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-foreground flex items-center gap-2">
          <LogoSvg size={24} />
          <span className="text-base font-semibold tracking-tight">
            {SiteConfig.title}
          </span>
        </Link>
      </div>
    </header>
  );
}

function OrgsPageFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-sm md:flex-row md:items-center">
        <p>
          © {year} {SiteConfig.company.name}
        </p>
        <div className="flex items-center gap-4">
          <Link to="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
