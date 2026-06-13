import { screen } from "@testing-library/react";
import { useLocation } from "@tanstack/react-router";
import { Home, Settings, User } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  SidebarMenuButtonLink,
  SidebarNavigationMenu,
  SidebarSubButtonLink,
} from "@/components/ui/sidebar-utils";
import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { setup } from "../test/setup";

// Mock matchMedia
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Also mock innerWidth for the useIsMobile hook
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    value: 1024, // Desktop size
  });
});

// Create a wrapper component with SidebarProvider
const withSidebarProvider = (children: React.ReactNode) => (
  <SidebarProvider>{children}</SidebarProvider>
);

describe("SidebarMenuButtonLink", () => {
  it("renders link with correct props", async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/test" } as ReturnType<
      typeof useLocation
    >);

    const { container } = setup(
      withSidebarProvider(
        <SidebarMenuButtonLink href="/test">Test Link</SidebarMenuButtonLink>,
      ),
    );

    const link = screen.getByRole("link", { name: "Test Link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    // Check that it has active class when pathname matches
    expect(container.querySelector('[data-active="true"]')).not.toBeNull();
  });

  it("applies inactive state when path doesn't match", async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/other" } as ReturnType<
      typeof useLocation
    >);

    const { container } = setup(
      withSidebarProvider(
        <SidebarMenuButtonLink href="/test">Test Link</SidebarMenuButtonLink>,
      ),
    );

    expect(container.querySelector('[data-active="true"]')).toBeNull();
  });
});

describe("SidebarSubButtonLink", () => {
  it("renders sub link with correct props", async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/test" } as ReturnType<
      typeof useLocation
    >);

    const { container } = setup(
      withSidebarProvider(
        <SidebarSubButtonLink href="/test">Test Sub Link</SidebarSubButtonLink>,
      ),
    );

    const link = screen.getByRole("link", { name: "Test Sub Link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(container.querySelector('[data-active="true"]')).not.toBeNull();
  });

  it("applies inactive state when path doesn't match", async () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/other",
    } as ReturnType<typeof useLocation>);

    const { container } = setup(
      withSidebarProvider(
        <SidebarSubButtonLink href="/test">Test Sub Link</SidebarSubButtonLink>,
      ),
    );

    expect(container.querySelector('[data-active="true"]')).toBeNull();
  });
});

describe("SidebarNavigationMenu", () => {
  it("renders navigation links correctly", async () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/dashboard",
    } as ReturnType<typeof useLocation>);

    const navigationGroup: NavigationGroup = {
      title: "Main",
      links: [
        {
          href: "/dashboard",
          Icon: Home,
          label: "Dashboard",
        },
        {
          href: "/profile",
          Icon: User,
          label: "Profile",
        },
      ],
    };

    setup(
      withSidebarProvider(<SidebarNavigationMenu link={navigationGroup} />),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders nested navigation structure correctly", async () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/settings/account",
    } as ReturnType<typeof useLocation>);

    const navigationGroup: NavigationGroup = {
      title: "Settings",
      links: [
        {
          href: "/settings",
          Icon: Settings,
          label: "Settings",
          links: [
            {
              href: "/settings/account",
              Icon: User,
              label: "Account Settings",
            },
          ],
        },
      ],
    };

    setup(
      withSidebarProvider(<SidebarNavigationMenu link={navigationGroup} />),
    );

    // Check that parent link is rendered
    expect(screen.getByText("Settings")).toBeInTheDocument();

    // Check that child link is rendered
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
  });
});
