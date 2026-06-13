import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Layout } from "@/features/page/layout";
import type { PropsWithChildren } from "react";
import AdminBreadcrumb from "./admin-breadcrumb";
import { AdminSidebar } from "./admin-sidebar";

export function AdminNavigation({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <Layout size="lg" className="flex items-center gap-2">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <AdminBreadcrumb />
          </Layout>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
