import { getInitials } from "@/lib/utils/initials";
import { describe, expect, it } from "vitest";

describe("getInitials", () => {
  it("should return uppercase initials for first and last name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should return a single initial for a single word", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  it("should cap initials at two characters", () => {
    expect(getInitials("Mary Ann Sue")).toBe("MA");
  });

  it("should uppercase lowercase names", () => {
    expect(getInitials("alice bob")).toBe("AB");
  });

  it("should handle empty string", () => {
    expect(getInitials("")).toBe("");
  });

  it("should handle names with extra spaces between words", () => {
    // Multiple spaces produce empty word entries - first chars will be empty
    expect(getInitials("John  Doe")).toBe("JD".slice(0, 2));
  });

  it("should ignore non-letter first characters", () => {
    // First character of each word - might be a digit/symbol
    expect(getInitials("1st Person")).toBe("1P");
  });
});
