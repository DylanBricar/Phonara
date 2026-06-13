import { AspectRatio } from "@/components/ui/aspect-ratio";
import { SiteConfig } from "@/site-config";
import type { ReactNode } from "react";

export const FeaturesSection = ({
  features,
}: {
  features: FeatureLineProps[];
}) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28" id="features">
      <div className="flex flex-col gap-16 lg:gap-28">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-[#666]">Features</p>
          <h2 className="font-elegant m-auto max-w-2xl text-center text-4xl tracking-tight text-[#fafafa] md:text-5xl">
            The boring SaaS checklist.
            <br />
            <em className="text-[#666]">Already handled.</em>
          </h2>
          <p className="m-auto max-w-lg text-center text-base leading-relaxed text-[#888]">
            Real {SiteConfig.title} demos for the features you usually lose
            weeks wiring by hand.
          </p>
        </div>
        {features.map((f, i) => (
          <FeatureLine
            key={i}
            badge={f.badge}
            title={f.title}
            description={f.description}
            component={f.component}
            demoSrc={f.demoSrc}
            demoTitle={f.demoTitle}
          />
        ))}
      </div>
    </section>
  );
};

type FeatureLineProps = {
  badge: string;
  title: string;
  description: string;
  component?: ReactNode;
  demoSrc?: string;
  demoTitle?: string;
};

const FeatureLine = (props: FeatureLineProps) => {
  const media = props.component ?? (
    <AspectRatio ratio={16 / 9}>
      <iframe
        src={props.demoSrc}
        title={props.demoTitle ?? `${props.title} demo`}
        allow="autoplay; fullscreen; picture-in-picture"
        loading="lazy"
        className="absolute inset-0 size-full border-0"
      />
    </AspectRatio>
  );

  return (
    <div className="flex items-center gap-8 odd:flex-row-reverse max-lg:!flex-col">
      <div className="flex flex-1 flex-col items-start gap-3">
        <span className="text-xs tracking-wider text-[#888] uppercase">
          {props.badge}
        </span>
        <h3 className="text-2xl font-medium tracking-tight text-[#fafafa]">
          {props.title}
        </h3>
        <p className="text-sm leading-relaxed text-[#888]">
          {props.description}
        </p>
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl shadow-black/20">
        {media}
      </div>
    </div>
  );
};
