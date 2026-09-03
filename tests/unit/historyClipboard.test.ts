import { describe, expect, test } from "bun:test";
import { writeClipboardText } from "../../src/components/settings/history/clipboard";

describe("writeClipboardText", () => {
  test("reports success only after the clipboard write resolves", async () => {
    const clipboard = { writeText: async () => undefined };

    expect(await writeClipboardText("copied text", clipboard)).toBe(true);
  });

  test("reports failure when the clipboard write rejects", async () => {
    const clipboard = {
      writeText: async () => {
        throw new Error("clipboard unavailable");
      },
    };

    const errors: unknown[] = [];
    expect(
      await writeClipboardText("copied text", clipboard, (_message, error) =>
        errors.push(error),
      ),
    ).toBe(false);
    expect(errors).toHaveLength(1);
  });
});
