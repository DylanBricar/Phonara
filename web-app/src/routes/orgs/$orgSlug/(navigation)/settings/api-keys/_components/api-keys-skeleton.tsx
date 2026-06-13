import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="flex flex-col gap-3 px-6">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
