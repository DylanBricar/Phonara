import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    readdir: mockReaddir,
    readFile: mockReadFile,
  },
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

import {
  getChangelogs,
  getCurrentChangelog,
} from "@/features/changelog/changelog-manager";

describe("changelog-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "development");
  });

  describe("getChangelogs", () => {
    it("should return empty array when directory is empty", async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await getChangelogs();

      expect(result).toEqual([]);
    });

    it("should return empty array when directory read fails", async () => {
      mockReaddir.mockRejectedValue(new Error("Directory not found"));

      const result = await getChangelogs();

      expect(result).toEqual([]);
    });

    it("should filter out non-mdx files", async () => {
      mockReaddir.mockResolvedValue([
        "readme.md",
        "config.json",
        "changelog.mdx",
      ]);

      mockReadFile.mockResolvedValue(`---
date: 2025-12-15
title: Test Changelog
---
Content here`);

      const result = await getChangelogs();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("changelog");
    });

    it("should parse valid mdx files correctly", async () => {
      mockReaddir.mockResolvedValue(["2025-12-15-v200.mdx"]);

      mockReadFile.mockResolvedValue(`---
date: 2025-12-15
version: v2.0.0
title: Major Update
image: /images/changelog/v200.png
status: published
---
This is the changelog content.`);

      const result = await getChangelogs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        slug: "2025-12-15-v200",
        content: "This is the changelog content.",
        attributes: {
          date: new Date("2025-12-15"),
          version: "v2.0.0",
          title: "Major Update",
          image: "/images/changelog/v200.png",
          status: "published",
        },
      });
    });

    it("should skip files with invalid frontmatter", async () => {
      mockReaddir.mockResolvedValue(["valid.mdx", "invalid.mdx"]);

      mockReadFile.mockResolvedValueOnce(`---
date: 2025-12-15
title: Valid
---
Valid content`).mockResolvedValueOnce(`---
invalid_field: true
---
Invalid content`);

      const result = await getChangelogs();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("valid");
    });

    it("should sort changelogs by date descending", async () => {
      mockReaddir.mockResolvedValue(["old.mdx", "new.mdx", "middle.mdx"]);

      mockReadFile.mockResolvedValueOnce(`---
date: 2025-01-01
title: Old
---
Old content`).mockResolvedValueOnce(`---
date: 2025-12-15
title: New
---
New content`).mockResolvedValueOnce(`---
date: 2025-06-15
title: Middle
---
Middle content`);

      const result = await getChangelogs();

      expect(result).toHaveLength(3);
      expect(result[0].attributes.title).toBe("New");
      expect(result[1].attributes.title).toBe("Middle");
      expect(result[2].attributes.title).toBe("Old");
    });

    it("should filter draft changelogs in production", async () => {
      vi.stubEnv("VERCEL_ENV", "production");

      mockReaddir.mockResolvedValue(["published.mdx", "draft.mdx"]);

      mockReadFile.mockResolvedValueOnce(`---
date: 2025-12-15
title: Published
status: published
---
Published content`).mockResolvedValueOnce(`---
date: 2025-12-16
title: Draft
status: draft
---
Draft content`);

      const result = await getChangelogs();

      expect(result).toHaveLength(1);
      expect(result[0].attributes.title).toBe("Published");
    });

    it("should include draft changelogs in development", async () => {
      vi.stubEnv("VERCEL_ENV", "development");

      mockReaddir.mockResolvedValue(["published.mdx", "draft.mdx"]);

      mockReadFile.mockResolvedValueOnce(`---
date: 2025-12-15
title: Published
status: published
---
Published content`).mockResolvedValueOnce(`---
date: 2025-12-16
title: Draft
status: draft
---
Draft content`);

      const result = await getChangelogs();

      expect(result).toHaveLength(2);
    });

    it("should default status to published when not specified", async () => {
      mockReaddir.mockResolvedValue(["no-status.mdx"]);

      mockReadFile.mockResolvedValue(`---
date: 2025-12-15
title: No Status
---
Content`);

      const result = await getChangelogs();

      expect(result).toHaveLength(1);
      expect(result[0].attributes.status).toBe("published");
    });
  });

  describe("getCurrentChangelog", () => {
    it("should return changelog by slug", async () => {
      mockReaddir.mockResolvedValue(["target.mdx", "other.mdx"]);

      mockReadFile.mockResolvedValueOnce(`---
date: 2025-12-15
title: Target
---
Target content`).mockResolvedValueOnce(`---
date: 2025-12-14
title: Other
---
Other content`);

      const result = await getCurrentChangelog("target");

      expect(result).toBeDefined();
      expect(result?.attributes.title).toBe("Target");
    });

    it("should return undefined for non-existent slug", async () => {
      mockReaddir.mockResolvedValue(["existing.mdx"]);

      mockReadFile.mockResolvedValue(`---
date: 2025-12-15
title: Existing
---
Content`);

      const result = await getCurrentChangelog("non-existent");

      expect(result).toBeUndefined();
    });
  });
});
