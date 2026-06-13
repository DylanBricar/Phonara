import { buttonVariants } from "@/components/ui/button";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";

export const CTAImageSection = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] sm:text-5xl">
          Start collecting better proof
        </h2>
        <p className="max-w-lg text-base leading-relaxed text-[#888]">
          Use {SiteConfig.title} to launch testimonial collection, showcase
          pages, and the SaaS workflows around them without rebuilding the
          basics.
        </p>
        <Link to="." hash="pricing" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
      </div>
    </section>
  );
};
