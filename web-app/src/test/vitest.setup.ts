import "@testing-library/jest-dom/vitest";

import type { AuthClientType } from "@/lib/auth-client";
import { cleanup } from "@testing-library/react";
import { fetch } from "cross-fetch";
import type { Resend } from "resend";
import type Stripe from "stripe";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

beforeEach(() => {
  cleanup();
});

// MOCKS

// Mock localStorage
const mockLocalStorage = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage.delete(key);
    }),
    clear: vi.fn(() => {
      mockLocalStorage.clear();
    }),
  },
  writable: true,
});

// Mock TanStack Router
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const React = await vi.importActual<typeof import("react")>("react");

  const MockLink = React.forwardRef<
    HTMLAnchorElement,
    { children?: React.ReactNode; to?: string } & Record<string, unknown>
  >(({ children, to, ...props }, ref) =>
    React.createElement("a", { href: to, ref, ...props }, children),
  );
  MockLink.displayName = "MockLink";

  return {
    ...actual,
    useRouter: vi.fn().mockReturnValue({
      navigate: vi.fn(),
      back: vi.fn(),
      history: { back: vi.fn() },
      invalidate: vi.fn(),
    }),
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
    useLocation: vi.fn().mockReturnValue({ pathname: "/" }),
    useSearch: vi.fn().mockReturnValue({}),
    useParams: vi.fn().mockReturnValue({}),
    Link: MockLink,
  };
});

// Mock TanStack Start server functions
vi.mock("@tanstack/react-start", () => {
  const createServerFn = (_opts?: Record<string, unknown>) => {
    let validator: ((input: unknown) => unknown) | null = null;

    const createCallable = (
      handlerFn: (opts: { data: unknown }) => unknown,
    ) => {
      const callable = async (input?: unknown) => {
        const data = validator ? validator(input) : input;
        return handlerFn({ data });
      };
      callable.inputValidator = (fn: (input: unknown) => unknown) => {
        validator = fn;
        return { handler: createCallable };
      };
      callable.handler = createCallable;
      return callable;
    };

    return {
      inputValidator: (fn: (input: unknown) => unknown) => {
        validator = fn;
        return { handler: createCallable };
      },
      handler: createCallable,
    };
  };

  const createMiddleware = (_opts?: Record<string, unknown>) => {
    const middlewareObj = {
      server: (fn: unknown) => fn,
      middleware: (_arr: unknown[]) => middlewareObj,
    };
    return middlewareObj;
  };

  return { createServerFn, createMiddleware };
});

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: vi.fn(),
}));

const stripe = mockDeep<Stripe>();
const authClient = mockDeep<AuthClientType>();
const resend = mockDeep<Resend>();
global.fetch = fetch;

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@/lib/stripe", () => ({ stripe }));
vi.mock("@/lib/auth-client", () => ({ authClient }));
vi.mock("@/lib/mail/resend", () => ({ resend }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/auth-server", () => ({
  fetchAuthQuery: vi.fn(),
  fetchAuthMutation: vi.fn(),
  fetchAuthAction: vi.fn(),
  getToken: vi.fn(),
  handler: vi.fn(),
}));
vi.mock("@/lib/auth/auth-user", () => ({
  getUser: vi.fn(),
  getRequiredUser: vi.fn(),
}));
vi.mock("@/lib/organizations/get-org", () => ({
  getCurrentOrg: vi.fn(),
  getRequiredCurrentOrg: vi.fn(),
}));

beforeEach(() => {
  mockReset(stripe);
  mockReset(authClient);

  vi.mocked(window.localStorage.getItem).mockClear();
  vi.mocked(window.localStorage.setItem).mockClear();
  vi.mocked(window.localStorage.removeItem).mockClear();
  vi.mocked(window.localStorage.clear).mockClear();

  mockLocalStorage.clear();
});
