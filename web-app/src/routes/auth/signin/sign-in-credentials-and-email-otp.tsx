import { Typography } from "@/components/nowts/typography";
import { SignInWithEmailOTP } from "./_components/sign-in-otp-form";
import { SignInPasswordForm } from "./_components/sign-in-password-form";
import { useState } from "react";

export const SignInCredentialsAndEmailOTP = (props: {
  callbackUrl: string;
  email?: string;
}) => {
  const [isUsingCredentials, setIsUsingCredentials] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sign-in-with-credentials") === "true";
  });

  const updateAuthMode = (nextValue: boolean) => {
    setIsUsingCredentials(nextValue);
    window.localStorage.setItem("sign-in-with-credentials", String(nextValue));
  };

  if (!isUsingCredentials) {
    return (
      <div className="max-w-lg space-y-4">
        <SignInWithEmailOTP
          callbackUrl={props.callbackUrl}
          email={props.email}
        />
        <Typography variant="muted" className="text-xs">
          Prefer password sign in?{" "}
          <Typography
            variant="link"
            as="button"
            type="button"
            onClick={() => {
              updateAuthMode(true);
            }}
          >
            Use password
          </Typography>
        </Typography>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <SignInPasswordForm callbackUrl={props.callbackUrl} email={props.email} />
      <Typography variant="muted" className="text-xs">
        Want faster sign in?{" "}
        <Typography
          variant="link"
          as="button"
          type="button"
          onClick={() => {
            updateAuthMode(false);
          }}
        >
          Login with OTP code
        </Typography>
      </Typography>
    </div>
  );
};
