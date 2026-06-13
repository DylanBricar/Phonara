import { createFileRoute } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { createNoIndexHead } from "@/lib/seo";
import { Link } from "@tanstack/react-router";
import { SiteConfig } from "@/site-config";

export const Route = createFileRoute("/(layout)/payment/success/")({
  head: () =>
    createNoIndexHead({
      title: "Payment Success",
      description: `Your ${SiteConfig.title} payment was completed successfully.`,
      path: "/payment/success",
    }),
  component: SuccessPaymentPage,
});

function SuccessPaymentPage() {
  return (
    <>
      <Layout>
        <LayoutHeader>
          <LayoutTitle>Thank You for Your Purchase!</LayoutTitle>
          <LayoutDescription>
            Your payment was successful! You now have full access to all our
            premium resources. If you have any questions, we're here to help.
          </LayoutDescription>
        </LayoutHeader>
        <LayoutContent>
          <Link to="/" className={buttonVariants({ size: "lg" })}>
            Get Started
          </Link>
        </LayoutContent>
      </Layout>
    </>
  );
}
