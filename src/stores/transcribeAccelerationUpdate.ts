import type { TranscribeAcceleratorSetting } from "@/bindings";

export interface TranscribeAccelerationSettings {
  transcribe_accelerator?: TranscribeAcceleratorSetting;
  transcribe_gpu_device?: number;
}

type PersistResult = { status: "ok" } | { status: "error"; error: string };

interface AtomicAccelerationUpdate<T extends TranscribeAccelerationSettings> {
  settings: T | null;
  accelerator: TranscribeAcceleratorSetting;
  gpuDevice: number;
  updateSettings: (updater: (settings: T | null) => T | null) => void;
  setUpdating: (key: string, updating: boolean) => void;
  isUpdating?: (key: string) => boolean;
  persist: (
    accelerator: TranscribeAcceleratorSetting,
    gpuDevice: number,
  ) => Promise<PersistResult>;
  reportError?: (message: string, error: unknown) => void;
}

export async function updateTranscribeAccelerationAtomically<
  T extends TranscribeAccelerationSettings,
>({
  settings,
  accelerator,
  gpuDevice,
  updateSettings,
  setUpdating,
  isUpdating,
  persist,
  reportError = console.error,
}: AtomicAccelerationUpdate<T>): Promise<boolean> {
  if (
    !settings ||
    isUpdating?.("transcribe_accelerator") ||
    isUpdating?.("transcribe_gpu_device")
  ) {
    return false;
  }

  const originalAccelerator = settings.transcribe_accelerator;
  const originalGpuDevice = settings.transcribe_gpu_device;

  setUpdating("transcribe_accelerator", true);
  setUpdating("transcribe_gpu_device", true);

  try {
    updateSettings((current) =>
      current
        ? {
            ...current,
            transcribe_accelerator: accelerator,
            transcribe_gpu_device: gpuDevice,
          }
        : null,
    );

    const result = await persist(accelerator, gpuDevice);
    if (result.status === "error") {
      throw new Error(result.error);
    }
    return true;
  } catch (error) {
    updateSettings((current) =>
      current
        ? {
            ...current,
            transcribe_accelerator: originalAccelerator,
            transcribe_gpu_device: originalGpuDevice,
          }
        : null,
    );
    reportError("Failed to update transcription acceleration:", error);
    return false;
  } finally {
    setUpdating("transcribe_accelerator", false);
    setUpdating("transcribe_gpu_device", false);
  }
}
