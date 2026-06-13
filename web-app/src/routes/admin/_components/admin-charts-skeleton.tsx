import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <Skeleton className="h-6 w-16 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-[120px] w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
