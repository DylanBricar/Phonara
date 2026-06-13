import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth/signin/otp/")({
  validateSearch: z.object({
    email: z.string().optional(),
    otp: z.string().optional(),
    callbackUrl: z.string().optional(),
  }),
  component: OtpVerificationRoute,
  pendingComponent: OtpVerificationPending,
});

function OtpVerificationRoute() {
  const search = Route.useSearch();

  return (
    <Suspense>
      <SignInOtpPage
        email={search.email}
        otp={search.otp}
        callbackUrl={search.callbackUrl}
      />
    </Suspense>
  );
}

function SignInOtpPage({
  email,
  otp,
  callbackUrl,
}: {
  email?: string;
  otp?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const redirectUrl = normalizeAuthCallbackUrl(callbackUrl);

  useEffect(() => {
    const verifyOtp = async () => {
      if (!email || !otp) {
        toast.error("Missing email or OTP parameters");
        void router.navigate({ to: "/auth/signin" });
        return;
      }

      try {
        await authClient.signIn.emailOtp({
          email,
          otp,
        });

        toast.success("Signed in successfully");
        void router.navigate({ to: redirectUrl });
      } catch {
        toast.error("Invalid or expired OTP");
        void router.navigate({ to: "/auth/signin" });
      }
    };

    void verifyOtp();
  }, [email, otp, redirectUrl, router]);

  return <OtpVerificationPending />;
}

function OtpVerificationPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingButton loading className="w-32">
          Verifying...
        </LoadingButton>
        <p className="text-muted-foreground text-sm">
          Please wait while we verify your code
        </p>
      </div>
    </div>
  );
}
