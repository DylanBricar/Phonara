import { Divider } from "@/components/nowts/divider";
import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ProviderButton } from "./provider-button";
import { SignInCredentialsAndEmailOTP } from "./sign-in-credentials-and-email-otp";

export const SignInProviders = ({
  providers,
  callbackUrl,
  email,
}: {
  providers: string[];
  callbackUrl: string;
  email?: string;
}) => {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <SignInCredentialsAndEmailOTP callbackUrl={callbackUrl} email={email} />
      {providers.length > 0 && <Divider>or</Divider>}

      <div
        className={cn("grid gap-2 lg:gap-4", {
          "grid-cols-1": providers.length === 1,
          "grid-cols-1 lg:grid-cols-2": providers.length > 1,
        })}
      >
        {providers.includes("github") && (
          <ProviderButton providerId="github" callbackUrl={callbackUrl} />
        )}
        {providers.includes("google") && (
          <ProviderButton providerId="google" callbackUrl={callbackUrl} />
        )}
      </div>

      <Typography variant="muted" className="text-xs">
        You don't have an account?{" "}
        <Link
          to="/auth/signup"
          search={{ callbackUrl }}
          className="dark:text-primary font-medium text-cyan-600 hover:underline"
        >
          Sign up
        </Link>
      </Typography>
    </div>
  );
};
