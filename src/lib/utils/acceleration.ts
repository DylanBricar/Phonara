import type { TranscribeAcceleratorSetting } from "@/bindings";

export function encodeTranscribeValue(
  accelerator: TranscribeAcceleratorSetting,
  gpuDevice: number,
): string {
  if (accelerator === "cpu") return "cpu";
  if (accelerator === "gpu") return `gpu:${Math.max(gpuDevice, 0)}`;
  return "auto";
}

export function decodeTranscribeValue(value: string): {
  accelerator: TranscribeAcceleratorSetting;
  gpuDevice: number;
} {
  if (value === "cpu") return { accelerator: "cpu", gpuDevice: -1 };
  if (value.startsWith("gpu:")) {
    const rawId = value.slice(4);
    const id = Number(rawId);
    if (/^\d+$/.test(rawId) && Number.isSafeInteger(id)) {
      return { accelerator: "gpu", gpuDevice: id };
    }
  }
  return { accelerator: "auto", gpuDevice: -1 };
}
