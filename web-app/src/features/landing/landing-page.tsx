import { BentoGridSection } from "@/features/landing/bento-section";
import { CTASectionCard } from "@/features/landing/cta/cta-card-section";
import { CTAImageSection } from "@/features/landing/cta/cta-image-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { FAQSection } from "@/features/landing/faq-section";
import { FeaturesSection } from "@/features/landing/feature-section";
import { Hero } from "@/features/landing/hero";
import { LandingHeader } from "@/features/landing/landing-header";
import { PainSection } from "@/features/landing/pain";
import { SectionDivider } from "@/features/landing/section-divider";
import { StatsSection } from "@/features/landing/stats-section";
import { Footer } from "@/features/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteConfig } from "@/site-config";
import {
  ClipboardPaste,
  Cpu,
  Keyboard,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

function FeatureVisual({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#132a42] to-[#141414] text-center">
      <Icon className="size-10 text-[#8eafc8]" strokeWidth={1.5} />
      <span className="text-xs tracking-wider text-[#5a7d99] uppercase">
        {label}
      </span>
    </div>
  );
}

export function LandingPageSkeleton() {
  return (
    <div className="landing-page dark flex min-h-screen flex-col bg-[#050505] px-6 pt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-[#1e3a5f]/30 px-6 py-20 text-center">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-16 w-full max-w-2xl" />
          <Skeleton className="h-20 w-full max-w-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-8 aspect-video w-full max-w-3xl rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page dark relative flex h-fit flex-col">
      <LandingHeader />

      <Hero />

      <StatsSection />

      <BentoGridSection />

      <PainSection />

      <SectionDivider />

      <FeaturesSection
        features={[
          {
            badge: "Trigger",
            title: "Press a shortcut, anywhere",
            description:
              "A global hotkey or push-to-talk starts recording from any app — no window to open, no button to click. Release and your words are on their way.",
            component: (
              <FeatureVisual icon={Keyboard} label="Global shortcut" />
            ),
          },
          {
            badge: "Transcribe",
            title: "Local Whisper & Parakeet",
            description:
              "Choose a Whisper model for accuracy or Parakeet for CPU-friendly speed. Silence is trimmed with on-device VAD. Everything runs on your machine.",
            component: <FeatureVisual icon={Cpu} label="On-device models" />,
          },
          {
            badge: "Refine",
            title: "Optional AI clean-up",
            description:
              "Send the transcript through a language model to fix grammar, reformat, or translate — using your own prompts and provider, or Apple Intelligence on macOS.",
            component: (
              <FeatureVisual icon={Sparkles} label="AI post-processing" />
            ),
          },
          {
            badge: "Output",
            title: "Pastes into any app",
            description:
              "The final text drops straight into the focused field of your editor, browser, terminal, or chat — exactly where your cursor is.",
            component: (
              <FeatureVisual icon={ClipboardPaste} label="Paste anywhere" />
            ),
          },
        ]}
      />

      <CTAImageSection />

      <CTASectionCard />

      <CtaSection />

      <FAQSection
        faq={[
          {
            question: `What is ${SiteConfig.title}?`,
            answer: `${SiteConfig.title} is a free, open-source desktop app that turns your speech into text in any application. Press a shortcut, talk, and the transcription is pasted where you're typing — all processed locally.`,
          },
          {
            question: "Is it really offline?",
            answer:
              "Yes. Transcription runs entirely on your device with local models, so your audio never leaves your computer. The only optional online step is AI clean-up, and only if you choose to configure a cloud provider for it.",
          },
          {
            question: "Which models does it use?",
            answer:
              "Whisper (Small, Medium, Turbo, Large) for high accuracy with GPU acceleration when available, and Parakeet V3 for fast CPU-only transcription with automatic language detection. Silero VAD filters out silence.",
          },
          {
            question: "What is AI post-processing?",
            answer:
              "An optional step that runs your transcript through a language model to clean up grammar, reformat, or translate it using prompts and actions you define. Bring your own OpenAI-compatible provider and key, or use Apple Intelligence on Apple Silicon Macs.",
          },
          {
            question: "Which platforms are supported?",
            answer:
              "macOS (Intel and Apple Silicon), Windows x64, and Linux x64. You'll grant microphone and accessibility permissions on first launch.",
          },
          {
            question: "How much does it cost?",
            answer: `${SiteConfig.title} is completely free and open source under the MIT license. No account, no subscription, no telemetry.`,
          },
          {
            question: "How do I install it?",
            answer:
              "Download the latest release for your platform from GitHub, install it, grant microphone and accessibility permissions, and set your shortcut. You can also build it from source.",
          },
        ]}
      />

      <SectionDivider />

      <Footer />
    </div>
  );
}
