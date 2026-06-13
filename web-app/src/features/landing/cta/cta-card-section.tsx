import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function CTASectionCard() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#1e3a5f]/30 bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#1a2a3a]">
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "250px",
          }}
        />

        <div className="relative z-[2] px-8 py-16 text-center sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wider text-[#c9d1d9] uppercase">
            Keep support close
          </span>

          <h2 className="font-elegant mx-auto mt-8 max-w-lg text-4xl tracking-tight text-white sm:text-5xl">
            Answer visitors without
            <br />
            losing the <em>human path.</em>
          </h2>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[#8eafc8]">
            Let the AI agent handle website questions first, then keep the same
            conversation ready for a human when the visitor needs one.
          </p>

          <div className="mt-10">
            <Link
              to="."
              search={(prev) => ({ ...prev, modal: "signin" })}
              mask={{ to: "/auth/signin", unmaskOnReload: true }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Open the app
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
