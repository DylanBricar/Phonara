import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminStatsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
