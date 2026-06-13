import { buttonVariants } from "@/components/ui/button";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa]">
            Ready to build on {SiteConfig.title}?
          </h2>
          <p className="mt-2 text-[#888]">
            Start from one production-ready workspace for auth, organizations,
            billing, docs, admin, and app foundations.
          </p>
        </div>
        <Link
          className={buttonVariants({ size: "lg" })}
          to="."
          search={(prev) => ({ ...prev, modal: "signin" })}
          mask={{ to: "/auth/signin", unmaskOnReload: true }}
        >
          Get started
        </Link>
      </div>
    </section>
  );
}
