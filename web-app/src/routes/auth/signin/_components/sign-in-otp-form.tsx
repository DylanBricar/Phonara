import { Typography } from "@/components/nowts/typography";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { LoadingButton } from "@/features/form/submit-button";
import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { cn } from "@/lib/utils";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";
import { z } from "zod";

const LoginWithEmailOTPScheme = z.object({
  email: z.string().email(),
});

type LoginWithEmailOTPType = z.infer<typeof LoginWithEmailOTPScheme>;

const OTP_SESSION_STORAGE_PREFIX = "nowstack:sign-in-email-otp";

function getOtpSessionStorageKey(callbackUrl?: string, email?: string) {
  return [
    OTP_SESSION_STORAGE_PREFIX,
    callbackUrl ?? "default",
    email?.toLowerCase() ?? "any",
  ].join(":");
}

function readStoredOtpEmail(storageKey: string, expectedEmail?: string) {
  if (typeof window === "undefined") return null;

  try {
    const storedEmail = window.sessionStorage.getItem(storageKey);
    if (!storedEmail) return null;

    if (
      expectedEmail &&
      storedEmail.toLowerCase() !== expectedEmail.toLowerCase()
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return storedEmail;
  } catch {
    return null;
  }
}

function storeOtpEmail(storageKey: string, email: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, email);
  } catch {
    // Ignore storage failures; the in-memory state still handles the flow.
  }
}

function clearStoredOtpEmail(storageKey: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures; the in-memory state still handles the flow.
  }
}

export const SignInWithEmailOTP = (props: {
  callbackUrl: string;
  email?: string;
}) => {
  const router = useRouter();
  const storageKey = getOtpSessionStorageKey(props.callbackUrl, props.email);
  const [otpEmail, setOtpEmail] = useState<string | null>(() =>
    readStoredOtpEmail(storageKey, props.email),
  );
  const [direction, setDirection] = useState(1);

  const signInMutation = useQueryMutation({
    mutationFn: async (values: LoginWithEmailOTPType) => {
      return unwrapSafePromise(
        authClient.emailOtp.sendVerificationOtp({
          email: values.email,
          type: "sign-in",
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to send sign-in code");
    },
    onSuccess: (_, values) => {
      storeOtpEmail(storageKey, values.email);
      setOtpEmail(values.email);
      setDirection(1);
    },
  });

  const verifyOtpMutation = useQueryMutation({
    mutationFn: async (otp: string) => {
      if (!otpEmail) {
        throw new Error("Email is required");
      }

      return unwrapSafePromise(
        authClient.signIn.emailOtp({
          email: otpEmail,
          otp: otp,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to verify sign-in code");
    },
    onSuccess: () => {
      clearStoredOtpEmail(storageKey);
      toast.success("Signed in successfully");
      void router.navigate({ to: props.callbackUrl });
    },
  });

  return (
    <div>
      <AnimatePresence mode="wait" custom={direction}>
        {otpEmail ? (
          <motion.div
            key="otp-verification-form"
            variants={variants}
            initial="initial"
            animate="active"
            exit="exit"
            transition={{ duration: 0.15 }}
            custom={direction}
          >
            <OtpVerificationForm
              email={otpEmail}
              onVerify={verifyOtpMutation.mutate}
              onResend={() => signInMutation.mutate({ email: otpEmail })}
              isResendPending={signInMutation.isPending}
              isVerifyPending={verifyOtpMutation.isPending}
              onBack={() => {
                clearStoredOtpEmail(storageKey);
                setDirection(-1);
                setOtpEmail(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="otp-email-form"
            variants={variants}
            animate="active"
            exit="exit"
            transition={{ duration: 0.15 }}
            custom={direction}
          >
            <OtpEmailForm
              onSubmit={(email) => signInMutation.mutate({ email })}
              defaultEmail={props.email ?? ""}
              isPending={signInMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const variants = {
  initial: (direction: number) => {
    return { x: `${20 * direction}px`, opacity: 0 };
  },
  active: { x: "0%", opacity: 1 },
  exit: (direction: number) => {
    return { x: `${-20 * direction}px`, opacity: 0 };
  },
};

const OtpEmailForm = (props: {
  onSubmit: (email: string) => void;
  defaultEmail?: string;
  isPending: boolean;
}) => {
  const form = useForm({
    schema: LoginWithEmailOTPScheme,
    defaultValues: {
      email: props.defaultEmail ?? "",
    },
    onSubmit: async (values: LoginWithEmailOTPType) => {
      props.onSubmit(values.email);
    },
  });

  return (
    <Form form={form} className="max-w-lg space-y-4">
      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input
                type="email"
                data-testid="otp-email-input"
                placeholder="john@doe.com"
              />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <LoadingButton
        loading={props.isPending}
        type="submit"
        className="ring-offset-card w-full ring-offset-2"
      >
        Sign in
      </LoadingButton>
    </Form>
  );
};

const OtpVerificationForm = (props: {
  onVerify: (otp: string) => void;
  onResend: () => void;
  isResendPending: boolean;
  isVerifyPending: boolean;
  email: string;
  onBack: () => void;
}) => {
  const [value, setValue] = useState("");

  const setOtpValue = (otp: string) => {
    setValue(otp);
    if (otp.length === 6) {
      props.onVerify(otp);
    }
  };

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <Typography variant="muted">
        A one-time password has been sent to{" "}
        <span className="font-bold">{props.email}</span>{" "}
        <Typography
          variant="link"
          as="button"
          onClick={props.onBack}
          className={cn("underline")}
        >
          Edit email
        </Typography>
      </Typography>
      <div className="flex items-center gap-2">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={setOtpValue}
          className={cn({
            "animate-pulse": props.isVerifyPending,
          })}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <ResendOtpButton
          isPending={props.isResendPending}
          onResend={props.onResend}
        />
      </div>
    </div>
  );
};

const ResendOtpButton = (props: {
  isPending: boolean;
  onResend: () => void;
}) => {
  const [countdown, setCountdown] = useState(0);

  const handleResend = () => {
    setCountdown(60);
    props.onResend();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Typography
      variant="link"
      as="button"
      onClick={handleResend}
      disabled={props.isPending || countdown > 0}
      className={cn(
        "underline",
        {
          "animate-pulse": props.isPending,
        },
        "disabled:opacity-50",
      )}
    >
      Resend {countdown > 0 ? `(${countdown})` : ""}
    </Typography>
  );
};
