import { describe, expect, test } from "bun:test";
import { updateSettingOptimistically } from "../../src/stores/settingPersistence";

interface TestSettings {
  always_on_microphone: boolean;
  audio_feedback: boolean;
}

function createHarness() {
  let settings: TestSettings | null = {
    always_on_microphone: false,
    audio_feedback: false,
  };
  const updating: Record<string, boolean> = {};
  const errors: unknown[] = [];
  return {
    get settings() {
      return settings;
    },
    set settings(value: TestSettings | null) {
      settings = value;
    },
    errors,
    isUpdating: (key: string) => updating[key] ?? false,
    setUpdating: (key: string, value: boolean) => {
      updating[key] = value;
    },
    updateSettings: (
      updater: (current: TestSettings | null) => TestSettings | null,
    ) => {
      settings = updater(settings);
    },
    reportError: (_message: string, error: unknown) => {
      errors.push(error);
    },
  };
}

describe("optimistic setting persistence", () => {
  test.each([undefined, null, { status: "ok", data: null }])(
    "keeps successful edits for void and Specta results: %j",
    async (result) => {
      const harness = createHarness();
      const success = await updateSettingOptimistically({
        ...harness,
        key: "always_on_microphone",
        value: true,
        persist: async (value) => {
          expect(value).toBe(true);
          return result;
        },
      });
      expect(success).toBe(true);
      expect(harness.settings?.always_on_microphone).toBe(true);
      expect(harness.isUpdating("always_on_microphone")).toBe(false);
      expect(harness.errors).toEqual([]);
    },
  );

  test.each(["resolved", "rejected"])(
    "rolls back %s failures while preserving unrelated edits",
    async (failure) => {
      const harness = createHarness();
      const success = await updateSettingOptimistically({
        ...harness,
        key: "always_on_microphone",
        value: true,
        persist: async () => {
          expect(harness.settings?.always_on_microphone).toBe(true);
          expect(harness.isUpdating("always_on_microphone")).toBe(true);
          harness.settings = {
            always_on_microphone: true,
            audio_feedback: true,
          };
          if (failure === "rejected") throw new Error("backend failed");
          return { status: "error", error: "backend failed" };
        },
      });
      expect(success).toBe(false);
      expect(harness.settings).toEqual({
        always_on_microphone: false,
        audio_feedback: true,
      });
      expect(harness.isUpdating("always_on_microphone")).toBe(false);
      expect(harness.errors).toHaveLength(1);
      expect(String(harness.errors[0])).toContain("backend failed");
    },
  );

  test("rejects an error result that has no detail", async () => {
    const harness = createHarness();
    await updateSettingOptimistically({
      ...harness,
      key: "always_on_microphone",
      value: true,
      persist: async () => ({ status: "error" }),
    });
    expect(String(harness.errors[0])).toContain("Setting update failed");
  });

  test("ignores a reentrant edit until the pending persistence finishes", async () => {
    const harness = createHarness();
    let release!: () => void;
    const pending = updateSettingOptimistically({
      ...harness,
      key: "always_on_microphone",
      value: true,
      persist: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const concurrent = await updateSettingOptimistically({
      ...harness,
      key: "always_on_microphone",
      value: false,
      persist: async () => {
        throw new Error("must not reach persistence");
      },
    });
    expect(concurrent).toBe(false);
    expect(harness.settings?.always_on_microphone).toBe(true);
    release();
    expect(await pending).toBe(true);
    expect(harness.isUpdating("always_on_microphone")).toBe(false);
  });

  test("does not persist before settings load", async () => {
    const harness = createHarness();
    harness.settings = null;
    const success = await updateSettingOptimistically({
      ...harness,
      key: "always_on_microphone",
      value: true,
      persist: async () => {
        throw new Error("must not reach persistence");
      },
    });
    expect(success).toBe(false);
    expect(harness.settings).toBeNull();
    expect(harness.errors).toEqual([]);
  });

  test.each([true, false])(
    "does not recreate settings cleared during persistence (success=%s)",
    async (success) => {
      const harness = createHarness();
      await updateSettingOptimistically({
        ...harness,
        key: "always_on_microphone",
        value: true,
        updateSettings: (updater) => {
          harness.settings = null;
          harness.updateSettings(updater);
        },
        persist: async () =>
          success ? undefined : { status: "error", error: "failed" },
      });
      expect(harness.settings).toBeNull();
      expect(harness.isUpdating("always_on_microphone")).toBe(false);
    },
  );
});
