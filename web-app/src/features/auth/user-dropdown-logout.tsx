import { Loader } from "@/components/nowts/loader";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { unwrapSafePromise } from "@/lib/promises";
import { LogOut } from "lucide-react";

export const UserDropdownLogout = () => {
  const logout = useQueryMutation({
    mutationFn: async () => unwrapSafePromise(signOut()),
    onSuccess: () => {
      window.location.assign("/auth/signin");
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        logout.mutate();
      }}
    >
      {logout.isPending ? (
        <Loader className="mr-2 size-4" />
      ) : (
        <LogOut className="mr-2 size-4" />
      )}
      <span>Logout</span>
    </DropdownMenuItem>
  );
};
