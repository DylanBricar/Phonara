import { Toaster } from "@/components/ui/sonner";
import { DialogManagerRenderer } from "@/features/dialog-manager/dialog-manager-renderer";
import { GlobalDialogLazy } from "@/features/global-dialog/global-dialog-lazy";
import { ServerToaster } from "@/features/server-sonner/server-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { Suspense, useState } from "react";

export const Providers = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <DialogManagerRenderer />
        <GlobalDialogLazy />
        {children}
        <Suspense>
          <ServerToaster />
        </Suspense>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: "bottom-left" }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
};
