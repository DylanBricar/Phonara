import { type FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "../ui/SettingContainer";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "@/bindings";
import type {
  TranscribeAcceleratorSetting,
  OrtAcceleratorSetting,
} from "@/bindings";
import {
  decodeTranscribeValue,
  encodeTranscribeValue,
} from "@/lib/utils/acceleration";

const ORT_LABELS: Record<OrtAcceleratorSetting, string> = {
  auto: "Auto",
  cpu: "CPU",
  cuda: "CUDA",
  directml: "DirectML",
  rocm: "ROCm",
};

interface AccelerationSelectorProps {
  descriptionMode?: "tooltip" | "inline";
  grouped?: boolean;
}

/**
 * transcribe.cpp dropdown encodes accelerator + device in a single value:
 *   "auto"   → accelerator=auto,  gpu_device=-1
 *   "cpu"    → accelerator=cpu,   gpu_device=-1
 *   "gpu:0"  → accelerator=gpu,   gpu_device=0
 *   "gpu:1"  → accelerator=gpu,   gpu_device=1
 */
export const AccelerationSelector: FC<AccelerationSelectorProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const [transcribeOptions, setTranscribeOptions] = useState<DropdownOption[]>(
    [],
  );
  const [ortOptions, setOrtOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    commands.getAvailableAccelerators().then((available) => {
      // Build combined transcribe.cpp options: Auto, [GPU devices...], CPU
      const opts: DropdownOption[] = [
        {
          value: "auto",
          label: t("settings.advanced.acceleration.gpuDevice.auto"),
        },
        {
          value: "gpu:0",
          label: `GPU (${t("settings.advanced.acceleration.gpuDevice.auto")})`,
        },
      ];

      for (const dev of available.gpu_devices) {
        if (dev.id === 0) continue;
        const vramLabel =
          dev.total_vram_mb >= 1024
            ? `${(dev.total_vram_mb / 1024).toFixed(1)} GB`
            : `${dev.total_vram_mb} MB`;
        opts.push({
          value: `gpu:${dev.id}`,
          label: `${dev.name} (${vramLabel})`,
        });
      }

      opts.push({ value: "cpu", label: "CPU" });
      setTranscribeOptions(opts);

      // ORT options (unchanged)
      const ortVals = available.ort.includes("auto")
        ? available.ort
        : ["auto", ...available.ort];
      setOrtOptions(
        ortVals.map((v) => ({
          value: v,
          label: ORT_LABELS[v as OrtAcceleratorSetting] ?? v,
        })),
      );
    });
  }, [t]);

  const currentAccelerator = getSetting("transcribe_accelerator") ?? "auto";
  const currentGpuDevice = getSetting("transcribe_gpu_device") ?? -1;
  const currentTranscribe = encodeTranscribeValue(
    currentAccelerator as TranscribeAcceleratorSetting,
    currentGpuDevice as number,
  );
  const currentOrt = getSetting("ort_accelerator") ?? "auto";

  const handleTranscribeChange = async (value: string) => {
    const { accelerator, gpuDevice } = decodeTranscribeValue(value);
    await updateSetting("transcribe_accelerator", accelerator);
    await updateSetting("transcribe_gpu_device", gpuDevice);
  };

  return (
    <>
      <SettingContainer
        title={t("settings.advanced.acceleration.transcribe.title")}
        description={t("settings.advanced.acceleration.transcribe.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        layout="horizontal"
      >
        <Dropdown
          options={transcribeOptions}
          selectedValue={currentTranscribe}
          onSelect={handleTranscribeChange}
          disabled={
            isUpdating("transcribe_accelerator") ||
            isUpdating("transcribe_gpu_device")
          }
        />
      </SettingContainer>
      {ortOptions.length > 2 && (
        <SettingContainer
          title={t("settings.advanced.acceleration.ort.title")}
          description={t("settings.advanced.acceleration.ort.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
          layout="horizontal"
        >
          <Dropdown
            options={ortOptions}
            selectedValue={currentOrt}
            onSelect={(value) =>
              updateSetting("ort_accelerator", value as OrtAcceleratorSetting)
            }
            disabled={isUpdating("ort_accelerator")}
          />
        </SettingContainer>
      )}
    </>
  );
};
