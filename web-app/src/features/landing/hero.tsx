import { AspectRatio } from "@/components/ui/aspect-ratio";
import { GithubIcon } from "@/features/landing/github-icon";
import { SiteConfig } from "@/site-config";
import { Download } from "lucide-react";

export const Hero = () => {
  return (
    <section className="px-6 pt-20 sm:pt-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#1e3a5f]/30 border-b-transparent bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#141414]">
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "250px",
          }}
        />

        <div className="relative z-[2] px-6 pt-20 pb-16 sm:px-12 sm:pt-28 sm:pb-20 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="flex flex-col items-center text-center">
            <span className="text-[13px] tracking-wide text-[#8eafc8]">
              Free - Open source - 100% offline
            </span>

            <h1 className="font-elegant mt-6 text-5xl tracking-tight text-white sm:text-6xl lg:text-[5.5rem] lg:leading-[1]">
              Speak. It types.
              <br />
              <em>Nothing leaves your Mac.</em>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#8eafc8]">
              {SiteConfig.title} is a desktop speech-to-text app. Press a
              shortcut, talk, and your words appear in any text field —
              transcribed locally with Whisper or Parakeet, with optional AI
              clean-up. Your voice never leaves your computer.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={SiteConfig.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Download className="size-4" />
                Download for free
              </a>
              <a
                href={SiteConfig.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-transparent px-6 text-sm font-medium text-[#8eafc8] transition-colors hover:bg-white/5 hover:text-white"
              >
                <GithubIcon className="size-4" />
                View on GitHub
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#5a7d99]">
              <span>macOS, Windows & Linux</span>
              <span className="hidden sm:inline">-</span>
              <span className="hidden sm:inline">No account, no cloud</span>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-[#ff5f57]" />
                <div className="size-3 rounded-full bg-[#febc2e]" />
                <div className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-3 text-[13px] font-medium text-[#c9d1d9]">
                {SiteConfig.title}
              </span>
            </div>
            <AspectRatio ratio={16 / 9}>
              <img
                src="/images/screenshot.png"
                alt={`${SiteConfig.title} desktop speech-to-text app`}
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            </AspectRatio>
          </div>
        </div>
      </div>
    </section>
  );
};
