import { fileToBase64 } from "@/lib/file-to-base64";
import { describe, expect, it } from "vitest";

describe("fileToBase64", () => {
  it("should convert a text file to base64 (without data URL prefix)", async () => {
    const file = new File(["hello world"], "hello.txt", {
      type: "text/plain",
    });

    const result = await fileToBase64(file);

    // "hello world" base64-encoded
    expect(result).toBe("aGVsbG8gd29ybGQ=");
  });

  it("should strip the data URL prefix", async () => {
    const file = new File(["abc"], "abc.txt", { type: "text/plain" });

    const result = await fileToBase64(file);

    // Should not contain "data:..." part
    expect(result).not.toContain("data:");
    expect(result).not.toContain(",");
  });

  it("should handle an empty file", async () => {
    const file = new File([], "empty.txt", { type: "text/plain" });

    const result = await fileToBase64(file);
    expect(result).toBe("");
  });

  it("should encode binary content", async () => {
    const bytes = new Uint8Array([255, 128, 0]);
    const file = new File([bytes], "bin.dat", {
      type: "application/octet-stream",
    });

    const result = await fileToBase64(file);
    // 0xFF, 0x80, 0x00 → "/4AA"
    expect(result).toBe("/4AA");
  });
});
