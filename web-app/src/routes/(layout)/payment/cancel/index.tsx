import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ContactSupportDialog } from "@/features/contact/support/contact-support-dialog";
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

export const Route = createFileRoute("/(layout)/payment/cancel/")({
  head: () =>
    createNoIndexHead({
      title: "Payment Canceled",
      description: `Your ${SiteConfig.title} payment was not completed.`,
      path: "/payment/cancel",
    }),
  component: CancelPaymentPage,
});

function CancelPaymentPage() {
  return (
    <Layout>
      <LayoutHeader>
        <Badge variant="outline">Payment failed</Badge>
        <LayoutTitle>
          We're sorry, but we couldn't process your payment
        </LayoutTitle>
        <LayoutDescription>
          We encountered an issue processing your payment.
          <br /> Please check your payment details and try again. <br />
          If the problem persists, don't hesitate to contact us for assistance.
          <br />
          We're here to help you resolve this smoothly.
        </LayoutDescription>
      </LayoutHeader>
      <LayoutContent className="flex items-center gap-2">
        <Link to="/" className={buttonVariants({ variant: "invert" })}>
          Home
        </Link>
        <ContactSupportDialog />
      </LayoutContent>
    </Layout>
  );
}
