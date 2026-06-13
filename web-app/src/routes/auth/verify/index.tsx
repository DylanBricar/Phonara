import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/auth/verify/")({
  head: () => ({
    meta: [
      { title: `Verify Your Email | ${SiteConfig.title}` },
      {
        name: "description",
        content:
          "Please check your email and click the verification link to complete your account setup.",
      },
    ],
  }),
  component: VerificationCard,
});

function VerificationCard() {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <Mail className="text-primary size-6" />
        </div>
        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-muted rounded-lg p-4 text-sm">
          <p className="mb-2 font-medium">Please check your inbox</p>
          <p className="text-muted-foreground">
            To complete your account setup, please open the verification email
            we just sent and click on the link inside.
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          <p>
            If you don't see the email in your inbox, please check your spam
            folder or request a new verification link.
          </p>
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Having trouble? Contact our support team for assistance.
        </p>
      </CardContent>
    </Card>
  );
}
