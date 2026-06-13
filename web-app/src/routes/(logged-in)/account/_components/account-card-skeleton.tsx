import { Skeleton } from "@/components/ui/skeleton";

export function AccountCardSkeleton({
  hasContent = true,
  hasFooter = true,
  contentLines = 1,
}: {
  hasContent?: boolean;
  hasFooter?: boolean;
  contentLines?: number;
}) {
  return (
    <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="flex flex-col gap-1.5 px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      {hasContent && (
        <div className="flex flex-col gap-3 px-6">
          {Array.from({ length: contentLines }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-80 rounded-md" />
          ))}
        </div>
      )}
      {hasFooter && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-end px-6">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}
