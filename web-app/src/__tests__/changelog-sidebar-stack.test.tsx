import { ChangelogSidebarStack } from "@/features/changelog/changelog-sidebar-stack";
import type { Changelog } from "@/features/changelog/changelog-manager";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../test/setup";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

const changelogs: Changelog[] = [
  {
    slug: "2026-03-05-v240",
    content: "Latest demo content",
    attributes: {
      date: new Date("2026-03-05"),
      version: "2.4.0",
      title: "Latest Demo",
      image: "/images/changelog/v150.png",
      status: "published",
    },
  },
  {
    slug: "2026-02-10-v230",
    content: "Analytics demo content",
    attributes: {
      date: new Date("2026-02-10"),
      version: "2.3.0",
      title: "Analytics Demo",
      image: "/images/changelog/v200.png",
      status: "published",
    },
  },
  {
    slug: "2026-01-15-v220",
    content: "Setup demo content",
    attributes: {
      date: new Date("2026-01-15"),
      version: "2.2.0",
      title: "Setup Demo",
      image: "/images/changelog/v210.png",
      status: "published",
    },
  },
];

describe("ChangelogSidebarStack", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it("renders changelog cards and opens the selected item in a dialog", async () => {
    const { user } = setup(<ChangelogSidebarStack changelogs={changelogs} />);

    expect(screen.getByText("What's new")).toBeInTheDocument();
    expect(screen.getByText("Latest Demo")).toBeInTheDocument();
    expect(screen.getByText("Analytics Demo")).toBeInTheDocument();
    expect(screen.getByText("Setup Demo")).toBeInTheDocument();

    await user.click(screen.getByText("Latest Demo"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Latest Demo" })).toBeVisible();
    expect(screen.getByText("Latest demo content")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /open page/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/changelog/$slug",
      params: { slug: "2026-03-05-v240" },
    });
  });

  it("dismisses visible changelogs in localStorage", async () => {
    const { user } = setup(<ChangelogSidebarStack changelogs={changelogs} />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByText("What's new")).not.toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("dismissed-changelogs") ?? "[]"),
    ).toEqual(["2026-03-05-v240", "2026-02-10-v230", "2026-01-15-v220"]);
  });
});
