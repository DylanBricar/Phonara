import { Logo } from "@/components/nowts/logo";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/features/form/submit-button";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useAsyncQuery } from "@/hooks/use-async-query";
import { authClient } from "@/lib/auth-client";
import type { ReactNode } from "react";

const ProviderData: Record<string, { icon: ReactNode; name: string }> = {
  github: {
    icon: <Logo name="github" size={16} />,
    name: "Github",
  },
  google: {
    icon: <Logo name="google" size={16} />,
    name: "Google",
  },
};

type ProviderButtonProps = {
  providerId: "github" | "google";
  callbackUrl: string;
};

export const ProviderButton = (props: ProviderButtonProps) => {
  const { data: lastUsedProvider } = useAsyncQuery({
    queryKey: ["lastUsedLoginMethod"],
    queryFn: () => {
      return authClient.getLastUsedLoginMethod();
    },
    initialData: undefined,
  });

  const signInMutation = useQueryMutation({
    mutationFn: async () => {
      await authClient.signIn.social({
        provider: props.providerId,
        callbackURL: props.callbackUrl,
      });
    },
  });

  const data = ProviderData[props.providerId];

  const isLastUsed = lastUsedProvider === props.providerId;

  return (
    <div className="relative w-full">
      {isLastUsed && (
        <Badge
          variant="outline"
          className="bg-background absolute -top-2.5 -right-2.5 z-10"
        >
          Last used
        </Badge>
      )}
      <LoadingButton
        loading={signInMutation.isPending}
        className="w-full"
        variant="outline"
        size="lg"
        onClick={() => {
          signInMutation.mutate();
        }}
      >
        {data.icon}
        <span className="ml-2">Sign in with {data.name}</span>
      </LoadingButton>
    </div>
  );
};
