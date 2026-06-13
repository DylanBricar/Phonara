import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toastClientError } from "@/lib/errors/client-error-message";

export function LinkStripeCustomer({
  autoCreate = false,
  organizationId,
}: {
  autoCreate?: boolean;
  organizationId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const didAutoCreate = useRef(false);
  const createStripeCustomer = useAction(
    api.admin.billing.createStripeCustomer,
  );

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    try {
      await createStripeCustomer({ organizationId });
      toast.success("Stripe customer created");
    } catch (e) {
      toastClientError(e, "Failed to create customer");
    } finally {
      setIsLoading(false);
    }
  }, [createStripeCustomer, organizationId]);

  useEffect(() => {
    if (!autoCreate || didAutoCreate.current) return;

    didAutoCreate.current = true;
    void handleCreate();
  }, [autoCreate, handleCreate]);

  return (
    <Button
      size="sm"
      className="justify-center sm:min-w-32"
      onClick={handleCreate}
      disabled={isLoading}
    >
      <Plus className="mr-1.5 size-3" />
      {isLoading
        ? "Creating..."
        : autoCreate
          ? "Retry customer"
          : "Create customer"}
    </Button>
  );
}
