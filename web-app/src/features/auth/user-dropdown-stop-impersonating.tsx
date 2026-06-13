import { Loader } from "@/components/nowts/loader";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { redirectAfterAuthSessionChange } from "@/lib/auth/session-transition";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
export const UserDropdownStopImpersonating = () => {
  const stopImpersonating = useQueryMutation({
    mutationFn: async () => {
      return unwrapSafePromise(authClient.admin.stopImpersonating());
    },
    onSuccess: () => {
      redirectAfterAuthSessionChange("/admin");
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        stopImpersonating.mutate();
      }}
    >
      {stopImpersonating.isPending ? (
        <Loader className="mr-2 size-4" />
      ) : (
        <LogOut className="mr-2 size-4" />
      )}
      Stop Impersonating
    </DropdownMenuItem>
  );
};
