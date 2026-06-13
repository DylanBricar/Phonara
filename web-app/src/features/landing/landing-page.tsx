import { BentoGridSection } from "@/features/landing/bento-section";
import { CTASectionCard } from "@/features/landing/cta/cta-card-section";
import { CTAImageSection } from "@/features/landing/cta/cta-image-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { FAQSection } from "@/features/landing/faq-section";
import { FeaturesSection } from "@/features/landing/feature-section";
import { Hero } from "@/features/landing/hero";
import { LandingHeader } from "@/features/landing/landing-header";
import { PainSection } from "@/features/landing/pain";
import { ReviewGrid } from "@/features/landing/review/review-grid";
import { ReviewSingle } from "@/features/landing/review/review-single";
import { ReviewTriple } from "@/features/landing/review/review-triple";
import { SectionDivider } from "@/features/landing/section-divider";
import { StatsSection } from "@/features/landing/stats-section";
import { Footer } from "@/features/layout/footer";
import { Pricing } from "@/features/plans/pricing-section";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteConfig } from "@/site-config";

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

      <ReviewTriple
        reviews={[
          {
            image: "https://i.pravatar.cc/300?u=a1",
            name: "Sophie",
            review: `${SiteConfig.title} **gave us a complete testimonial workflow** without weeks of setup. We launched collection forms, approvals, and public pages from the same codebase.`,
            role: "Digital Marketer",
          },
          {
            image: "https://i.pravatar.cc/300?u=a2",
            name: "Alex",
            review: `Using ${SiteConfig.title} helped us turn customer quotes into reusable proof. **The public pages and metadata were ready from day one**, which made launch much cleaner.`,
            role: "Social Media Influencer",
          },
          {
            image: "https://i.pravatar.cc/300?u=a3",
            name: "Jordan",
            review: `The auth, organizations, billing, and admin flows saved serious build time. **${SiteConfig.title} feels like a real SaaS product**, not a bare starter.`,
            role: "Entrepreneur",
          },
        ]}
      />

      <SectionDivider />

      <ReviewSingle
        image="https://i.pravatar.cc/300?u=5"
        name="Michel"
        review={`${SiteConfig.title} **helped us ship a customer-proof workflow faster**. The testimonial collection, showcase, and billing pieces **were already working together.**`}
        role="Digital Marketer"
        compagnyImage="https://1000logos.net/wp-content/uploads/2017/03/McDonalds-Logo-2003.png"
        key={1}
      />

      <FeaturesSection
        features={[
          {
            badge: "Teams",
            title: "Multi-tenant organizations",
            description:
              "Let customers create teams, invite members, and manage roles without rebuilding org logic again.",
            demoSrc:
              "https://www.tella.tv/video/vid_cmoy1po3o010i04k41gofbeug/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Dialogs",
            title: "Modal chaos, retired",
            description:
              "Open confirms, alerts, and custom dialogs from one API instead of juggling local state everywhere.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-5wio/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Landing",
            title: "A real landing page",
            description:
              "Hero, features, pricing, FAQ, footer, and responsive polish are already in place for launch.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-0p8o/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Docs",
            title: "Documentation that ships",
            description:
              "Write Markdown, keep navigation clean, and publish user-facing docs without inventing another content system.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-ae2k/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Changelog",
            title: "Proof that you ship",
            description:
              "Publish product updates, fixes, RSS, and release notes so users can see the product moving.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-8t6o/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Auth",
            title: "Password and providers",
            description:
              "Better Auth is wired for password, reset emails, and OAuth providers so login stops being the first sprint.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-5kbm/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Admin",
            title: "An admin you can show people",
            description:
              "Manage users, organizations, payments, and operational data from a polished shadcn workspace.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-h1l4/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
          {
            badge: "Quality",
            title: "The serious codebase stuff",
            description:
              "Types, tests, error handling, observability, and structure are designed like a product people will maintain.",
            demoSrc:
              "https://www.tella.tv/video/melvynxs-video-7qhi/embed?b=0&title=0&a=1&loop=1&autoPlay=true&t=0&muted=1&wt=1&o=1",
          },
        ]}
      />

      <CTAImageSection />

      <CTASectionCard />

      <CtaSection />

      <Pricing />

      <FAQSection
        faq={[
          {
            question: `What is ${SiteConfig.title}?`,
            answer: `${SiteConfig.title} is a modern SaaS starter focused on testimonial collection, showcase pages, organizations, billing, admin workflows, and content-driven growth.`,
          },
          {
            question: "What can I build with it?",
            answer:
              "You can launch a customer-proof SaaS with video and text collection, public proof pages, account areas, Stripe billing, Better Auth organizations, Convex data, docs, blog, and changelog content.",
          },
          {
            question: "Is it SEO-ready?",
            answer:
              "Yes. Public pages can ship with route-level metadata, canonical URLs, Open Graph and Twitter images, structured data, sitemap, robots, RSS, and prerendered content routes.",
          },
          {
            question: "Does it include billing and organizations?",
            answer: `Yes. ${SiteConfig.title} includes Stripe billing, organization-aware flows, account areas, admin pages, and Convex-backed server logic.`,
          },
          {
            question: "Can I customize the product?",
            answer:
              "Yes. The app is built with TanStack Start, React, TailwindCSS, shadcn/base-ui components, and Convex so teams can adapt the product model, content, and UI.",
          },
          {
            question: "What problem does it solve?",
            answer:
              "It removes the repeated setup work around auth, billing, content, admin, SEO, and core SaaS operations so you can focus on the product-specific workflow.",
          },
          {
            question: "What pricing model does it support?",
            answer:
              "The template includes Stripe plan wiring and pricing sections that can be adapted to free, premium, team, or enterprise SaaS tiers.",
          },
        ]}
      />

      <SectionDivider />

      <ReviewGrid
        reviews={[
          {
            image: "https://i.pravatar.cc/300?u=b1",
            name: "Eva",
            review: `Since we started with ${SiteConfig.title}, our testimonial workflow has been much cleaner. Customers submit proof, the team reviews it, and the best quotes are ready to publish.`,
            role: "Content Creator",
          },
          {
            image: "https://i.pravatar.cc/300?u=b2",
            name: "Lucas",
            review: `${SiteConfig.title}'s organization and billing setup saved us from rebuilding the same account infrastructure again. It gave the product a mature base immediately.`,
            role: "Social Media Manager",
          },
          {
            image: "https://i.pravatar.cc/300?u=b3",
            name: "Mia",
            review:
              "The public content routes, blog, docs, and changelog make the product feel serious. We could explain the product and collect leads from day one.",
            role: "Digital Marketer",
          },
          {
            image: "https://i.pravatar.cc/300?u=b4",
            name: "Noah",
            review: `I was skeptical about starters, but ${SiteConfig.title} already had the operational pieces I usually spend weeks wiring together.`,
            role: "Blogger",
          },
          {
            image: "https://i.pravatar.cc/300?u=b5",
            name: "Isabella",
            review: `${SiteConfig.title}'s interface gave our team a practical admin and account experience quickly. It felt like a product instead of a scaffold.`,
            role: "Team Leader",
          },
          {
            image: "https://i.pravatar.cc/300?u=b6",
            name: "Oliver",
            review:
              "The testimonial showcase workflow made it simple to reuse customer proof across the marketing site without manual copy-and-paste.",
            role: "Freelancer",
          },
          {
            image: "https://i.pravatar.cc/300?u=b7",
            name: "Sophia",
            review:
              "The combination of Convex, Better Auth, Stripe, and polished public routes helped us move from idea to launch much faster.",
            role: "Influencer",
          },
          {
            image: "https://i.pravatar.cc/300?u=b8",
            name: "Elijah",
            review: `${SiteConfig.title} gave us enough structure to stay consistent while still being flexible enough to customize the core product.`,
            role: "Strategist",
          },
          {
            image: "https://i.pravatar.cc/300?u=b9",
            name: "Charlotte",
            review:
              "The Stripe-backed pricing setup gave us a credible SaaS business model without slowing down the product build.",
            role: "Entrepreneur",
          },
          {
            image: "https://i.pravatar.cc/300?u=b10",
            name: "James",
            review:
              "The docs, changelog, and admin pages gave our launch a level of polish that would have taken a long time to assemble from scratch.",
            role: "Customer",
          },
        ]}
      />

      <SectionDivider />

      <Footer />
    </div>
  );
}
