import { buttonVariants } from "@/components/ui/button";
import { Header } from "@/features/layout/header";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth/new-user/")({
  validateSearch: z.object({
    callbackUrl: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: `Welcome | ${SiteConfig.title}` },
      {
        name: "description",
        content:
          "Welcome to your new account! You're all set up and ready to start.",
      },
    ],
  }),
  beforeLoad: ({ search }) => {
    const callbackUrl = search.callbackUrl ?? "/";
    throw redirect({ to: callbackUrl });
  },
  component: NewUserPage,
});

function NewUserPage() {
  return (
    <>
      <Header />
      <Layout>
        <LayoutHeader>
          <LayoutTitle>Successfully login</LayoutTitle>
          <LayoutDescription>You can now use the app</LayoutDescription>
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
