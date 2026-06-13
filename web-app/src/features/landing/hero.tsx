import { AspectRatio } from "@/components/ui/aspect-ratio";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";

const HERO_DEMO_SRC =
  "https://www.tella.tv/video/cmfm9a9dl00hd0biediza24kv/embed?b=0&title=0&a=1&loop=1&t=0&muted=1&wt=0";

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
              TanStack Start, Convex, Expo
            </span>

            <h1 className="font-elegant mt-6 text-5xl tracking-tight text-white sm:text-6xl lg:text-[5.5rem] lg:leading-[1]">
              Launch your app in 1 week
              <br />
              with <em>senior-dev code.</em>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#8eafc8]">
              Start from a professional, secure codebase to publish your SaaS or
              mobile app without rebuilding auth, billing, organizations, docs,
              admin, and product plumbing.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="."
                search={(prev) => ({ ...prev, modal: "signin" })}
                mask={{ to: "/auth/signin", unmaskOnReload: true }}
                className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Start building
              </Link>
              <Link
                to="."
                hash="features"
                className="inline-flex h-10 items-center rounded-full border border-white/10 bg-transparent px-6 text-sm font-medium text-[#8eafc8] transition-colors hover:bg-white/5 hover:text-white"
              >
                See the demos
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#5a7d99]">
              <span>SaaS + mobile foundations</span>
              <span className="hidden sm:inline">-</span>
              <span className="hidden sm:inline">
                Built for AI-assisted shipping
              </span>
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
              <iframe
                src={HERO_DEMO_SRC}
                title={`${SiteConfig.title} SaaS and mobile demo`}
                allow="autoplay; fullscreen; picture-in-picture"
                className="absolute inset-0 size-full border-0"
              />
            </AspectRatio>
          </div>
        </div>
      </div>
    </section>
  );
};
