import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "@tanstack/react-router";
import { type PropsWithChildren } from "react";

export function InterceptDialog({ children }: PropsWithChildren) {
  const router = useRouter();

  return (
    <Dialog open={true} onOpenChange={() => router.history.back()}>
      {children}
    </Dialog>
  );
}
