import { describe, expect, test } from "bun:test";
import {
  findPreferredDevice,
  isMicrophonePriority,
  moveMicrophonePreference,
  resolveMicrophonePriority,
} from "../../src/lib/microphonePreferences";

const devices = [
  { id: "usb-a", name: "USB microphone", is_default: true },
  { id: "usb-b", name: "USB microphone", is_default: false },
  { id: "headset", name: "Headset", is_default: false },
];

describe("microphone preferences", () => {
  test("validates settings event payloads before updating the editor", () => {
    expect(isMicrophonePriority([])).toBe(true);
    expect(
      isMicrophonePriority([
        { id: null, name: "Legacy" },
        { id: "id", name: "USB" },
      ]),
    ).toBe(true);
    for (const invalid of [
      null,
      {},
      [null],
      [{ name: "USB" }],
      [{ id: 1, name: "USB" }],
      [{ id: "id", name: 1 }],
    ]) {
      expect(isMicrophonePriority(invalid)).toBe(false);
    }
  });
  test("stable identity wins even when devices share a name or are renamed", () => {
    expect(
      findPreferredDevice({ id: "usb-b", name: "Old name" }, devices)?.id,
    ).toBe("usb-b");
    expect(
      findPreferredDevice({ id: "missing", name: "Headset" }, devices),
    ).toBeUndefined();
  });

  test("legacy names only match one unambiguous connected microphone", () => {
    expect(
      findPreferredDevice({ id: null, name: "Headset" }, devices)?.id,
    ).toBe("headset");
    expect(
      findPreferredDevice({ id: null, name: "USB microphone" }, devices),
    ).toBeUndefined();
    expect(
      findPreferredDevice({ id: null, name: "Disconnected" }, devices),
    ).toBeUndefined();
  });

  test("moving keeps offline entries and does not mutate the saved order", () => {
    const saved = [
      { id: "offline", name: "Studio" },
      { id: "headset", name: "Headset" },
    ];
    expect(moveMicrophonePreference(saved, 1, -1).map(({ id }) => id)).toEqual([
      "headset",
      "offline",
    ]);
    expect(saved.map(({ id }) => id)).toEqual(["offline", "headset"]);
    expect(moveMicrophonePreference(saved, 0, -1)).toEqual(saved);
    expect(moveMicrophonePreference(saved, 1, 1)).toEqual(saved);
    expect(moveMicrophonePreference([], 0, 1)).toEqual([]);
  });

  test("resolving a legacy collision keeps its higher rank only once", () => {
    const priority = [
      { id: null, name: "Headset" },
      { id: "offline", name: "Studio" },
      { id: "headset", name: "Old headset name" },
    ];
    expect(resolveMicrophonePriority(priority, devices)).toEqual([
      { id: "headset", name: "Headset" },
      { id: "offline", name: "Studio" },
    ]);
    expect(priority[0].id).toBeNull();
  });

  test("a lower ranked legacy duplicate does not displace an explicit device", () => {
    expect(
      resolveMicrophonePriority(
        [
          { id: "headset", name: "Old headset name" },
          { id: "offline", name: "Studio" },
          { id: null, name: "Headset" },
          { id: "usb-a", name: "USB microphone" },
          { id: "usb-b", name: "USB microphone" },
          { id: null, name: "Ambiguous legacy" },
        ],
        devices,
      ),
    ).toEqual([
      { id: "headset", name: "Headset" },
      { id: "offline", name: "Studio" },
      { id: "usb-a", name: "USB microphone" },
      { id: "usb-b", name: "USB microphone" },
      { id: null, name: "Ambiguous legacy" },
    ]);
  });
});
