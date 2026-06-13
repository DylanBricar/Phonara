import { createFileRoute } from "@tanstack/react-router";
import { Typography } from "@/components/nowts/typography";
import { SectionLayout } from "@/features/landing/section-layout";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/(layout)/about/")({
  head: () =>
    createSeoHead({
      title: "About",
      description: `Learn why ${SiteConfig.title} is built for long-term testimonial collection, trustworthy customer stories, and transparent product updates.`,
      path: "/about",
      jsonLd: breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]),
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SectionLayout size="sm" variant="transparent">
      <div className="mx-auto max-w-2xl">
        <Typography
          variant="p"
          className="text-primary text-base/7 font-semibold"
        >
          About us
        </Typography>
        <Typography
          variant="h1"
          className="text-foreground mt-2 text-5xl font-semibold tracking-tight sm:text-7xl"
        >
          Building trust through authentic testimonials
        </Typography>
        <Typography
          variant="p"
          className="text-muted-foreground mt-8 text-lg font-medium text-pretty sm:text-xl/8"
        >
          A platform you can trust, built by a dedicated founder committed to
          continuous innovation, regular updates, and transparent communication
          with our community.
        </Typography>
      </div>

      <div className="mx-auto mt-20 max-w-2xl border-t pt-12">
        <Typography
          variant="h2"
          className="text-foreground text-2xl font-semibold tracking-tight text-pretty"
        >
          Our commitment to you
        </Typography>
        <Typography
          variant="p"
          className="text-muted-foreground mt-6 text-base/7"
        >
          {SiteConfig.title} is built with a long-term vision and unwavering
          commitment to our users. We understand that choosing a platform means
          trusting us with your most valuable asset — your reputation and
          relationships with clients.
        </Typography>
        <Typography
          variant="p"
          className="text-muted-foreground mt-6 text-base/7"
        >
          That's why we guarantee regular updates, continuous feature
          improvements, and transparent communication about every change. You'll
          never be left wondering about the future of your testimonials or our
          platform. We're here to grow with you, not abandon you.
        </Typography>
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <Typography
          variant="p"
          className="text-muted-foreground text-base/7 font-semibold"
        >
          Our reliability promise
        </Typography>
        <hr className="border-border mt-6 border-t" />
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="border-border flex flex-col gap-y-2 border-b border-dotted pb-4">
            <dt className="text-muted-foreground text-sm/6">Weekly Updates</dt>
            <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
              <span>100</span>%
            </dd>
          </div>
          <div className="border-border flex flex-col gap-y-2 border-b border-dotted pb-4">
            <dt className="text-muted-foreground text-sm/6">
              Uptime Guarantee
            </dt>
            <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
              <span>99.9</span>%
            </dd>
          </div>
          <div className="flex flex-col gap-y-2">
            <dt className="text-muted-foreground text-sm/6">Response Time</dt>
            <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
              <span>&lt;24</span>h
            </dd>
          </div>
          <div className="flex flex-col gap-y-2">
            <dt className="text-muted-foreground text-sm/6">Years Committed</dt>
            <dd className="text-foreground order-first text-6xl font-semibold tracking-tight">
              <span>10</span>+
            </dd>
          </div>
        </dl>
      </div>
    </SectionLayout>
  );
}
