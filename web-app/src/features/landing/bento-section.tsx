import {
  BarChart3,
  BrainCircuit,
  Calendar,
  CalendarCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { SiteConfig } from "@/site-config";

const benefits = [
  {
    id: "ai-generation",
    title: "AI Review Assist",
    description:
      "Turn raw customer responses into polished testimonial drafts faster.",
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "scheduling",
    title: "Collection Campaigns",
    description:
      "Create branded request flows for video and text testimonials.",
    icon: <Calendar className="size-4" />,
  },
  {
    id: "calendar",
    title: "Review Pipeline",
    description:
      "Track collected, reviewed, approved, and published testimonials clearly.",
    icon: <CalendarCheck className="size-4" />,
  },
  {
    id: "analytics",
    title: "Proof Analytics",
    description:
      "Understand which testimonials convert and where they perform.",
    icon: <BarChart3 className="size-4" />,
  },
  {
    id: "smart-repost",
    title: "Showcase Reuse",
    description:
      "Reuse the strongest proof across landing pages and customer journeys.",
    icon: <Zap className="size-4" />,
  },
  {
    id: "insights",
    title: "AI Insights",
    description:
      "Identify strong quotes, common objections, and proof worth publishing.",
    icon: <BrainCircuit className="size-4" />,
  },
];

export function BentoGridSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <p className="text-sm text-[#666]">Why {SiteConfig.title}</p>
      <h2 className="font-elegant mt-3 text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Everything you need to grow
        <br />
        your audience - <em className="text-[#666]">nothing you don't.</em>
      </h2>
      <p className="mt-4 max-w-xl text-base text-[#888]">
        Stop rebuilding the same SaaS foundations. {SiteConfig.title} gives you
        the product surface, billing, content, and admin workflows in one place.
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
