import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/features/form/submit-button";
import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { toastClientError } from "@/lib/errors/client-error-message";
import { unwrapSafePromise } from "@/lib/promises";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth/forget-password/")({
  head: () => ({
    meta: [
      { title: `Forget Password | ${SiteConfig.title}` },
      {
        name: "description",
        content: "Reset your password by entering your email address.",
      },
    ],
  }),
  component: ForgetPasswordPage,
  pendingComponent: ForgetPasswordSkeleton,
});

function ForgetPasswordSkeleton() {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-2 text-center">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="mt-4 flex flex-col gap-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

type Step = "email" | "otp" | "password";

const EmailFormSchema = z.object({
  email: z.string().email(),
});

const PasswordFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function ForgetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [direction, setDirection] = useState(1);

  const sendOtpMutation = useQueryMutation({
    mutationFn: async (values: { email: string }) => {
      return unwrapSafePromise(
        authClient.forgetPassword.emailOtp({
          email: values.email,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to send reset email");
    },
    onSuccess: (_, values) => {
      setEmail(values.email);
      setDirection(1);
      setStep("otp");
    },
  });

  const verifyOtpMutation = useQueryMutation({
    mutationFn: async (otpValue: string) => {
      return unwrapSafePromise(
        authClient.emailOtp.checkVerificationOtp({
          email,
          type: "forget-password",
          otp: otpValue,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to reset password");
      setOtp("");
    },
    onSuccess: () => {
      setDirection(1);
      setStep("password");
    },
  });

  const resetPasswordMutation = useQueryMutation({
    mutationFn: async (values: { password: string }) => {
      return unwrapSafePromise(
        authClient.emailOtp.resetPassword({
          email,
          otp,
          password: values.password,
        }),
      );
    },
    onError: (error) => {
      toastClientError(error, "Failed to reset password");
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      void router.navigate({ to: "/auth/signin" });
    },
  });

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate(value);
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step === "otp") {
      setStep("email");
      setOtp("");
    } else if (step === "password") {
      setStep("otp");
      setOtp("");
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-2 text-center">
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          {step === "email" && "Enter your email to reset your password"}
          {step === "otp" && "Enter the code sent to your email"}
          {step === "password" && "Enter your new password"}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-4">
        <AnimatePresence mode="wait" custom={direction}>
          {step === "email" && (
            <motion.div
              key="email-step"
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={direction}
            >
              <EmailStep
                onSubmit={(emailValue) =>
                  sendOtpMutation.mutate({ email: emailValue })
                }
                isPending={sendOtpMutation.isPending}
                defaultEmail={email}
              />
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp-step"
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={direction}
            >
              <OtpStep
                email={email}
                otp={otp}
                onOtpChange={handleOtpChange}
                onResend={() => sendOtpMutation.mutate({ email })}
                isResendPending={sendOtpMutation.isPending}
                isVerifyPending={verifyOtpMutation.isPending}
                onBack={goBack}
              />
            </motion.div>
          )}

          {step === "password" && (
            <motion.div
              key="password-step"
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={direction}
            >
              <PasswordStep
                onSubmit={(password) =>
                  resetPasswordMutation.mutate({ password })
                }
                isPending={resetPasswordMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

const variants = {
  initial: (direction: number) => {
    return { x: `${20 * direction}px`, opacity: 0 };
  },
  active: { x: "0%", opacity: 1 },
  exit: (direction: number) => {
    return { x: `${-20 * direction}px`, opacity: 0 };
  },
};

const EmailStep = (props: {
  onSubmit: (email: string) => void;
  isPending: boolean;
  defaultEmail?: string;
}) => {
  const form = useForm({
    schema: EmailFormSchema,
    defaultValues: {
      email: props.defaultEmail ?? "",
    },
    onSubmit: async (values) => {
      props.onSubmit(values.email);
    },
  });

  return (
    <Form form={form} className="flex w-full flex-col gap-4">
      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input type="email" placeholder="your@email.com" />
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
        Send Reset Code
      </LoadingButton>
    </Form>
  );
};

const OtpStep = (props: {
  email: string;
  otp: string;
  onOtpChange: (otp: string) => void;
  onResend: () => void;
  isResendPending: boolean;
  isVerifyPending: boolean;
  onBack: () => void;
}) => {
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
          value={props.otp}
          onChange={props.onOtpChange}
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

const PasswordStep = (props: {
  onSubmit: (password: string) => void;
  isPending: boolean;
}) => {
  const form = useForm({
    schema: PasswordFormSchema,
    defaultValues: {
      password: "",
    },
    onSubmit: async (values) => {
      props.onSubmit(values.password);
    },
  });

  return (
    <Form form={form} className="flex w-full flex-col gap-4">
      <form.AppField name="password">
        {(field) => (
          <field.Field>
            <field.Label>New Password</field.Label>
            <field.Content>
              <field.Input type="password" placeholder="••••••••" />
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
        Reset Password
      </LoadingButton>
    </Form>
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
