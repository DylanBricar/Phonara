import { Typography } from "@/components/nowts/typography";
import { Layout, LayoutContent } from "@/features/page/layout";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import Markdown from "markdown-to-jsx";

const markdown = `Terms demo`;

export const Route = createFileRoute("/(layout)/legal/terms/")({
  head: () =>
    createSeoHead({
      title: "Terms of Service",
      description: `Read the ${SiteConfig.title} terms of service for using the testimonial SaaS platform.`,
      path: "/legal/terms",
      jsonLd: breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Terms of Service", path: "/legal/terms" },
      ]),
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div>
      <div className="bg-card flex w-full items-center justify-center p-8 lg:p-12">
        <Typography variant="h1">Terms</Typography>
      </div>
      <Layout>
        <LayoutContent className="typography m-auto mb-8">
          <Markdown>{markdown}</Markdown>
        </LayoutContent>
      </Layout>
    </div>
  );
}
