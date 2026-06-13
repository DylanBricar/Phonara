import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { Typography } from "../../components/nowts/typography";
import { buttonVariants } from "../../components/ui/button";

export function Page404() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="bg-muted/50 flex size-16 items-center justify-center rounded-2xl border">
          <Search className="text-muted-foreground size-7" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <Typography variant="h2">Page not found</Typography>
          <Typography variant="muted" className="text-base">
            The page you're looking for doesn't exist or has been moved. Check
            the URL or head back to {SiteConfig.title}.
          </Typography>
        </div>

        <Link to="/" className={buttonVariants({ variant: "default" })}>
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
