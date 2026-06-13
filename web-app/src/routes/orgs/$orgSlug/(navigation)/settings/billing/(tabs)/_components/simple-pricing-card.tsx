import { Typography } from "@/components/nowts/typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type * as React from "react";

type SimpleCardProps = {
  title: string;
  price: string;
  period?: string;
  features: string[];
  action?: React.ReactNode;
  className?: string;
};

export function SimplePricingCard({
  title,
  price,
  period,
  features,
  action,
  className,
}: SimpleCardProps) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader className="gap-2">
        <Typography variant="h3">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Typography>
        <div className="flex items-baseline gap-1">
          <Typography className="text-3xl font-bold">{price}</Typography>
          {period && <Typography variant="muted">/{period}</Typography>}
        </div>
        {action}
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-col gap-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <Check className="text-primary size-5 shrink-0" />
            <Typography variant="small">{feature}</Typography>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
