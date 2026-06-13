import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

export const setup = (
  jsx: ReactElement,
  options?: Omit<RenderOptions, "queries">,
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    user: userEvent.setup(),
    ...render(jsx, { wrapper: Wrapper, ...options }),
  };
};
