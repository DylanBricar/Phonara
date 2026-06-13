import { Typography } from "@/components/nowts/typography";
import { Layout, LayoutContent } from "@/features/page/layout";
import { breadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import Markdown from "markdown-to-jsx";

const markdown = `Privacy demo`;

export const Route = createFileRoute("/(layout)/legal/privacy/")({
  head: () =>
    createSeoHead({
      title: "Privacy Policy",
      description: `Read the ${SiteConfig.title} privacy policy and learn how customer and testimonial data is handled.`,
      path: "/legal/privacy",
      jsonLd: breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/legal/privacy" },
      ]),
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div>
      <div className="bg-card flex w-full items-center justify-center p-8 lg:p-12">
        <Typography variant="h1">Privacy</Typography>
      </div>
      <Layout>
        <LayoutContent className="typography m-auto mb-8">
          <Markdown>{markdown}</Markdown>
        </LayoutContent>
      </Layout>
    </div>
  );
}
