import {
  LandingPage,
  LandingPageSkeleton,
} from "@/features/landing/landing-page";
import { createNoIndexHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/")({
  head: () =>
    createNoIndexHead({
      title: "Home",
      description: `${SiteConfig.title} homepage.`,
    }),
  component: LandingPage,
  pendingComponent: LandingPageSkeleton,
});
