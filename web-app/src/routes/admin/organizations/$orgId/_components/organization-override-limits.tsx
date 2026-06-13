import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import type { Subscription } from "@/lib/auth/stripe/auth-plans";
import type { OverrideLimits } from "@/lib/auth/stripe/auth-plans";
import { getPlanLimits, PLAN_LIMIT_KEYS } from "@/lib/auth/stripe/auth-plans";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";

export function OrganizationOverrideLimits({
  subscription,
  organizationId,
}: {
  subscription: Subscription | null;
  organizationId: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const updateOverrideLimits = useAction(api.admin.billing.updateOverrideLimits);
  const currentOverrideLimits =
    subscription?.overrideLimits as OverrideLimits | null;
  const planLimits = getPlanLimits(subscription?.plan ?? "free");

  const [limits, setLimits] = useState<OverrideLimits>(
    currentOverrideLimits ?? {},
  );

  const [showForm, setShowForm] = useState(!!currentOverrideLimits);
  const limitKeys = PLAN_LIMIT_KEYS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const overrideLimits = limitKeys.reduce<OverrideLimits>((next, key) => {
        const value = limits[key];

        if (typeof value === "number" && Number.isFinite(value)) {
          next[key] = value;
        }

        return next;
      }, {});
      const hasAnyLimit = Object.keys(overrideLimits).length > 0;

      await updateOverrideLimits({
        organizationId,
        overrideLimits: hasAnyLimit ? overrideLimits : undefined,
      });
    } catch {
      // Error is handled by the action
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = () => {
    dialogManager.confirm({
      title: "Reset Override Limits",
      description:
        "Are you sure you want to reset all override limits? The organization will use the default plan limits.",
      action: {
        label: "Reset Limits",
        onClick: async () => {
          setIsUpdating(true);
          try {
            await updateOverrideLimits({
              organizationId,
              overrideLimits: undefined,
            });
          } finally {
            setIsUpdating(false);
          }
        },
      },
    });
  };

  if (!showForm) {
    return (
      <Card className="border-border/70 border shadow-sm">
        <CardHeader>
          <CardTitle>Override Limits</CardTitle>
          <CardDescription>
            Customize plan limits for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button onClick={() => setShowForm(true)} size="sm" variant="outline">
            Add Override Limits
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 border shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Override Limits</CardTitle>
          <CardDescription>
            Customize plan limits for this organization.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex max-w-sm flex-col gap-4">
            {limitKeys.map((key) => {
              const inputId = `override-limit-${key}`;
              const overrideValue = limits[key];

              return (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={inputId} className="capitalize">
                    {key}
                  </Label>
                  <Input
                    id={inputId}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder={String(planLimits[key])}
                    value={overrideValue ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLimits((prev) => ({
                        ...prev,
                        [key]: value === "" ? undefined : parseInt(value, 10),
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {currentOverrideLimits && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isUpdating}
                  size="sm"
                >
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                disabled={isUpdating}
                size="sm"
              >
                Cancel
              </Button>
            </div>
            <Button
              type="submit"
              disabled={isUpdating}
              size="sm"
              className="justify-center sm:min-w-28"
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
