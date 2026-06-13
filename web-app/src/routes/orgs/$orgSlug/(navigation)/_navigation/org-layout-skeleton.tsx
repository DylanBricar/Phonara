import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";

export function OrgLayoutSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-12" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
        </header>
        <div className="m-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 pt-0">
          <Skeleton className="h-8 w-36" />
          <div className="flex w-full items-start gap-4 max-lg:flex-col lg:gap-8">
            <Skeleton className="h-24 w-full flex-1 rounded-xl" />
            <Skeleton className="h-24 w-full flex-1 rounded-xl" />
            <Skeleton className="h-24 w-full flex-1 rounded-xl" />
            <Skeleton className="h-24 w-full flex-1 rounded-xl" />
          </div>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
