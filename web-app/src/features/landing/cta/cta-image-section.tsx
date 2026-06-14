import { buttonVariants } from "@/components/ui/button";
import { SiteConfig } from "@/site-config";
import { Download } from "lucide-react";

export const CTAImageSection = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] sm:text-5xl">
          Ready to stop typing?
        </h2>
        <p className="max-w-lg text-base leading-relaxed text-[#888]">
          Install {SiteConfig.title}, pick your model, and dictate into any app
          on macOS, Windows, or Linux — without sending your voice to the cloud.
        </p>
        <a
          href={SiteConfig.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: "lg" })}
        >
          <Download className="size-4" />
          Download for free
        </a>
      </div>
    </section>
  );
};
