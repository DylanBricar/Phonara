import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, XAxis } from "recharts";
import type { MrrDataPoint } from "./admin-charts-data";

type MrrChartProps = {
  data: MrrDataPoint[];
};

const chartConfig = {
  mrr: {
    label: "MRR",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function MrrChart({ data }: MrrChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => {
      const [year, month] = item.date.split("-");
      const date = new Date(Number(year), Number(month) - 1);
      return {
        ...item,
        formattedDate: date.toLocaleDateString("en-US", {
          month: "short",
        }),
      };
    });
  }, [data]);

  const currentMrr =
    chartData.length > 0 ? chartData[chartData.length - 1].mrr : 0;
  const previousMrr =
    chartData.length > 1 ? chartData[chartData.length - 2].mrr : 0;
  const growth =
    previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0;
  const isPositive = growth >= 0;

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Monthly Recurring Revenue
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatCurrency(currentMrr)}
            </p>
          </div>
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              isPositive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {isPositive ? "+" : ""}
            {growth.toFixed(1)}%
          </div>
        </div>

        <div className="mt-6">
          <ChartContainer className="h-[120px] w-full" config={chartConfig}>
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-mrr)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-mrr)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="var(--color-mrr)"
                fill="url(#mrrGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
