import { describe, expect, test } from "bun:test";
import {
  formatKeyCombination,
  getKeyName,
  normalizeKey,
  type OSType,
} from "../../src/lib/utils/keyboard";

const keyEvent = (
  overrides: Partial<KeyboardEvent> & { keyCode?: number; which?: number },
): KeyboardEvent => overrides as KeyboardEvent;

describe("getKeyName", () => {
  test.each([
    ["KeyA", "a"],
    ["Digit7", "7"],
    ["F12", "f12"],
    ["Numpad4", "numpad 4"],
    ["ArrowLeft", "left"],
    ["Slash", "/"],
  ])("maps keyboard code %s", (code, expected) => {
    expect(getKeyName(keyEvent({ code }))).toBe(expected);
  });

  test("uses platform names for modifier codes", () => {
    expect(getKeyName(keyEvent({ code: "AltLeft" }), "macos")).toBe("option");
    expect(getKeyName(keyEvent({ code: "MetaLeft" }), "macos")).toBe("command");
    expect(getKeyName(keyEvent({ code: "MetaLeft" }), "linux")).toBe("super");
  });

  test("falls back to key names and legacy key codes", () => {
    expect(getKeyName(keyEvent({ key: "Meta" }), "windows")).toBe("win");
    expect(getKeyName(keyEvent({ key: " " }))).toBe("space");
    expect(getKeyName(keyEvent({ keyCode: 255 }))).toBe("unknown-255");
  });
});

describe("formatKeyCombination", () => {
  test.each([
    { combo: "", os: "unknown" as OSType, expected: "" },
    {
      combo: "ctrl+shift+a",
      os: "windows" as OSType,
      expected: "Ctrl + Shift + A",
    },
    {
      combo: "f12+alt_left",
      os: "macos" as OSType,
      expected: "F12 + Left Alt",
    },
    {
      combo: "fn+meta_right",
      os: "macos" as OSType,
      expected: "fn + Right Meta",
    },
  ])("formats $combo", ({ combo, os, expected }) => {
    expect(formatKeyCombination(combo, os)).toBe(expected);
  });
});

describe("normalizeKey", () => {
  test("drops left/right prefixes for two-part modifier names", () => {
    expect(normalizeKey("left alt")).toBe("alt");
    expect(normalizeKey("right ctrl")).toBe("ctrl");
  });

  test("leaves other keys untouched", () => {
    expect(normalizeKey("space")).toBe("space");
    expect(normalizeKey("left mouse button")).toBe("left mouse button");
  });
});
