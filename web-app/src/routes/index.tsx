import {
  LandingPage,
  LandingPageSkeleton,
} from "@/features/landing/landing-page";
import { getUser } from "@/lib/auth/auth-user";
import { createSeoHead, softwareApplicationJsonLd } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute, redirect } from "@tanstack/react-router";

const homeSeoHead = createSeoHead({
  title: SiteConfig.seo.defaultTitle,
  description: SiteConfig.description,
  path: "/",
  image: SiteConfig.seo.defaultImage,
  jsonLd: softwareApplicationJsonLd(),
});

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (SiteConfig.features.enableLandingRedirection) {
      const user = await getUser();

      if (!user) {
        return;
      }

      throw redirect({ to: "/orgs" });
    }
  },
  component: LandingPage,
  pendingComponent: LandingPageSkeleton,
  head: () => ({
    meta: homeSeoHead.meta,
    links: homeSeoHead.links,
  }),
});
