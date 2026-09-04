import { describe, expect, test } from "bun:test";
import { buildOverlayStyle } from "../../src/overlay/presentation";

describe("overlay presentation", () => {
  test("keeps the listening pill compact when the live panel is customized", () => {
    const style = buildOverlayStyle({
      state: "streaming",
      borderColor: "#db2929",
      backgroundColor: null,
      borderWidth: 3,
      customWidth: 280,
      customHeight: 50,
    });

    expect(style).toEqual({
      "--s-border": "color-mix(in srgb, #db2929 52%, transparent)",
      "--phonara-border-width": "2px",
      "--ov-open-w": "280px",
      "--ov-base-h": "42px",
    });
    expect(style).not.toHaveProperty("--ov-rest-w");
    expect(style).not.toHaveProperty("--ov-pill-w");
    expect(style).not.toHaveProperty("--ov-work-w");
  });

  test("ignores invalid colors and clamps extreme dimensions", () => {
    expect(
      buildOverlayStyle({
        state: "recording",
        borderColor: "red",
        backgroundColor: "#123456",
        borderWidth: 10,
        customWidth: 500,
        customHeight: 120,
      }),
    ).toEqual({
      "--s-surface": "color-mix(in srgb, #123456 94%, transparent)",
      "--phonara-border-width": "2px",
      "--ov-open-w": "460px",
      "--ov-base-h": "42px",
    });
  });

  test("leaves automatic dimensions untouched when no customization exists", () => {
    expect(
      buildOverlayStyle({
        state: "processing",
        borderColor: null,
        backgroundColor: null,
        borderWidth: undefined,
        customWidth: undefined,
        customHeight: undefined,
      }),
    ).toEqual({});
  });
});
