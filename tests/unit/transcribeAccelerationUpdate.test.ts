import { describe, expect, test } from "bun:test";
import {
  updateTranscribeAccelerationAtomically,
  type TranscribeAccelerationSettings,
} from "../../src/stores/transcribeAccelerationUpdate";

function createHarness() {
  let settings: TranscribeAccelerationSettings | null = {
    transcribe_accelerator: "cpu",
    transcribe_gpu_device: -1,
  };
  const updating: Array<[string, boolean]> = [];
  const updatingState: Record<string, boolean> = {};

  return {
    get settings() {
      return settings;
    },
    updating,
    isUpdating: (key: string) => updatingState[key] ?? false,
    updateSettings: (
      updater: (
        current: TranscribeAccelerationSettings | null,
      ) => TranscribeAccelerationSettings | null,
    ) => {
      settings = updater(settings);
    },
    setUpdating: (key: string, value: boolean) => {
      updatingState[key] = value;
      updating.push([key, value]);
    },
  };
}

describe("atomic transcription acceleration updates", () => {
  test("keeps both optimistic values after persistence succeeds", async () => {
    const harness = createHarness();

    const succeeded = await updateTranscribeAccelerationAtomically({
      settings: harness.settings,
      accelerator: "gpu",
      gpuDevice: 2,
      updateSettings: harness.updateSettings,
      setUpdating: harness.setUpdating,
      isUpdating: harness.isUpdating,
      persist: async () => ({ status: "ok" }),
    });

    expect(succeeded).toBe(true);
    expect(harness.settings).toEqual({
      transcribe_accelerator: "gpu",
      transcribe_gpu_device: 2,
    });
    expect(harness.updating).toEqual([
      ["transcribe_accelerator", true],
      ["transcribe_gpu_device", true],
      ["transcribe_accelerator", false],
      ["transcribe_gpu_device", false],
    ]);
  });

  test("rolls back both values when persistence rejects the pair", async () => {
    const harness = createHarness();
    const errors: unknown[] = [];

    const succeeded = await updateTranscribeAccelerationAtomically({
      settings: harness.settings,
      accelerator: "gpu",
      gpuDevice: 2,
      updateSettings: harness.updateSettings,
      setUpdating: harness.setUpdating,
      isUpdating: harness.isUpdating,
      persist: async () => ({ status: "error", error: "invalid device" }),
      reportError: (_message, error) => errors.push(error),
    });

    expect(succeeded).toBe(false);
    expect(harness.settings).toEqual({
      transcribe_accelerator: "cpu",
      transcribe_gpu_device: -1,
    });
    expect(errors).toHaveLength(1);
  });

  test("does not persist before settings are loaded", async () => {
    let persisted = false;

    const succeeded = await updateTranscribeAccelerationAtomically({
      settings: null,
      accelerator: "gpu",
      gpuDevice: 0,
      updateSettings: () => {},
      setUpdating: () => {},
      persist: async () => {
        persisted = true;
        return { status: "ok" };
      },
    });

    expect(succeeded).toBe(false);
    expect(persisted).toBe(false);
  });

  test("ignores a concurrent update while persistence is in flight", async () => {
    const harness = createHarness();
    let finishPersistence!: (result: { status: "ok" }) => void;
    let persistCalls = 0;

    const firstUpdate = updateTranscribeAccelerationAtomically({
      settings: harness.settings,
      accelerator: "gpu",
      gpuDevice: 0,
      updateSettings: harness.updateSettings,
      setUpdating: harness.setUpdating,
      isUpdating: harness.isUpdating,
      persist: async () => {
        persistCalls += 1;
        return new Promise<{ status: "ok" }>((resolve) => {
          finishPersistence = resolve;
        });
      },
    });

    const secondUpdate = await updateTranscribeAccelerationAtomically({
      settings: harness.settings,
      accelerator: "gpu",
      gpuDevice: 2,
      updateSettings: harness.updateSettings,
      setUpdating: harness.setUpdating,
      isUpdating: harness.isUpdating,
      persist: async () => {
        persistCalls += 1;
        return { status: "ok" };
      },
    });

    expect(secondUpdate).toBe(false);
    expect(persistCalls).toBe(1);
    finishPersistence({ status: "ok" });
    expect(await firstUpdate).toBe(true);
    expect(harness.settings).toEqual({
      transcribe_accelerator: "gpu",
      transcribe_gpu_device: 0,
    });
  });
});
