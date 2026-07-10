import { describe, expect, test } from "bun:test";
import {
  decodeTranscribeValue,
  encodeTranscribeValue,
} from "../../src/lib/utils/acceleration";

describe("transcribe accelerator values", () => {
  test("encodes automatic, CPU, and GPU device selections", () => {
    expect(encodeTranscribeValue("auto", -1)).toBe("auto");
    expect(encodeTranscribeValue("cpu", -1)).toBe("cpu");
    expect(encodeTranscribeValue("gpu", -1)).toBe("gpu:0");
    expect(encodeTranscribeValue("gpu", 3)).toBe("gpu:3");
  });

  test("decodes automatic, CPU, and GPU device selections", () => {
    expect(decodeTranscribeValue("auto")).toEqual({
      accelerator: "auto",
      gpuDevice: -1,
    });
    expect(decodeTranscribeValue("cpu")).toEqual({
      accelerator: "cpu",
      gpuDevice: -1,
    });
    expect(decodeTranscribeValue("gpu:0")).toEqual({
      accelerator: "gpu",
      gpuDevice: 0,
    });
    expect(decodeTranscribeValue("gpu:3")).toEqual({
      accelerator: "gpu",
      gpuDevice: 3,
    });
  });
});
