import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "@/features/landing/github-icon";
import { SiteConfig } from "@/site-config";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa]">
            Open source and yours to extend
          </h2>
          <p className="mt-2 text-[#888]">
            {SiteConfig.title} is built to be the most forkable speech-to-text
            app. Read the code, file an issue, or make it your own.
          </p>
        </div>
        <a
          className={buttonVariants({ size: "lg" })}
          href={SiteConfig.github}
          target="_blank"
          rel="noreferrer"
        >
          <GithubIcon className="size-4" />
          Star on GitHub
        </a>
      </div>
    </section>
  );
}
