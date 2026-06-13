import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteConfig } from "@/site-config";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";

export const Route = createFileRoute("/auth/goodbye/")({
  head: () => ({
    meta: [
      { title: `Account Deleted | ${SiteConfig.title}` },
      {
        name: "description",
        content:
          "Your account has been successfully deleted. Thank you for using our service.",
      },
    ],
  }),
  component: GoodbyePage,
});

function GoodbyePage() {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader>
        <div className="flex justify-center">
          <Avatar className="size-16">
            <AvatarFallback>
              <CheckCircle />
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-center">Account Deleted</CardTitle>
        <CardDescription className="text-center">
          Your account has been successfully deleted. We're sorry to see you go.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4">
        <div className="flex w-full flex-col gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            Your account and all associated data have been permanently removed
            from our system.
          </p>
          <p className="text-muted-foreground text-sm">
            If you change your mind, you're welcome to create a new account
            anytime.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/signup">Create New Account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
