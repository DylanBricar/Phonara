import {
  ClipboardPaste,
  Cpu,
  Keyboard,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteConfig } from "@/site-config";

const benefits = [
  {
    id: "shortcut",
    title: "Press to talk",
    description:
      "Trigger recording from anywhere with a global shortcut or push-to-talk. No window to focus first.",
    icon: <Keyboard className="size-4" />,
  },
  {
    id: "local-models",
    title: "On-device models",
    description:
      "Whisper and Parakeet run locally, with GPU acceleration when your machine has it.",
    icon: <Cpu className="size-4" />,
  },
  {
    id: "ai-cleanup",
    title: "Optional AI clean-up",
    description:
      "Fix grammar, reformat, or translate transcripts with your own prompts and provider.",
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "paste-anywhere",
    title: "Pastes anywhere",
    description:
      "The result drops straight into the focused text field of whatever app you're using.",
    icon: <ClipboardPaste className="size-4" />,
  },
  {
    id: "private",
    title: "Private by design",
    description:
      "No account, no telemetry, no cloud round-trips. Voice data stays on your computer.",
    icon: <ShieldCheck className="size-4" />,
  },
  {
    id: "cross-platform",
    title: "Cross-platform",
    description:
      "macOS, Windows, and Linux from one open codebase you can read and extend.",
    icon: <MonitorSmartphone className="size-4" />,
  },
];

export function BentoGridSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <p className="text-sm text-[#666]">Why {SiteConfig.title}</p>
      <h2 className="font-elegant mt-3 text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Everything you need to dictate
        <br />
        anywhere - <em className="text-[#666]">nothing you don't.</em>
      </h2>
      <p className="mt-4 max-w-xl text-base text-[#888]">
        {SiteConfig.title} does one job well: turn what you say into text in any
        app, locally and instantly, with optional AI polish.
      </p>

      <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#888]">{benefit.icon}</span>
              <h3 className="text-[15px] font-medium text-[#fafafa]">
                {benefit.title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[#666]">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
