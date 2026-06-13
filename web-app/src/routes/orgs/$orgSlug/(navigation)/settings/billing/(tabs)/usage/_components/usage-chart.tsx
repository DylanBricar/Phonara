import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UsageMetric = {
  label: string;
  current: number;
  limit: number;
  description: string;
  isTracked: boolean;
  unit?: string;
};

type UsageChartProps = {
  metrics: UsageMetric[];
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subscriptionStatus: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
};

function formatMetricValue(value: number, unit?: string) {
  return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
}

function getBarColor(percentage: number) {
  if (percentage >= 90) return "bg-destructive";
  if (percentage >= 75) return "bg-warning";
  return "bg-foreground";
}

export function UsageChart({
  metrics,
  billingPeriodStart,
  billingPeriodEnd,
  subscriptionStatus,
}: UsageChartProps) {
  const formattedPeriod = `${billingPeriodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${billingPeriodEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Usage</CardTitle>
            <Badge variant="outline">
              {subscriptionStatus
                ? (STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus)
                : "Free"}
            </Badge>
          </div>
          <CardDescription>Billing period: {formattedPeriod}</CardDescription>
        </CardHeader>
        <CardContent>
          <Typography variant="muted">
            Track the metrics tied to your billing limits here.
          </Typography>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const percentage =
            metric.limit > 0
              ? Math.min(100, (metric.current / metric.limit) * 100)
              : 0;

          return (
            <Card key={metric.label}>
              <CardContent className="flex flex-col gap-5">
                <div className="text-muted-foreground text-sm font-medium">
                  {metric.label}
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">
                    {metric.current.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    / {formatMetricValue(metric.limit, metric.unit)}
                  </span>
                </div>

                <div
                  className="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      getBarColor(percentage),
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
