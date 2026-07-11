import { describe, expect, test } from "bun:test";
import {
  canCancelOnboardingDownload,
  selectedModelAfterCancellation,
  shouldStartOnboardingSelection,
} from "../../src/components/onboarding/onboardingDownloadState";

describe("onboarding download cancellation", () => {
  test("only exposes another cancellation while no model is being selected", () => {
    expect(canCancelOnboardingDownload(null, "model-b")).toBe(true);
    expect(canCancelOnboardingDownload("model-a", "model-a")).toBe(true);
    expect(canCancelOnboardingDownload("model-a", "model-b")).toBe(false);
  });

  test("clears only the model whose cancellation succeeded", () => {
    expect(selectedModelAfterCancellation("model-a", "model-a", true)).toBe(
      null,
    );
    expect(selectedModelAfterCancellation("model-a", "model-b", true)).toBe(
      "model-a",
    );
    expect(selectedModelAfterCancellation("model-a", "model-a", false)).toBe(
      "model-a",
    );
  });

  test("does not select a model that completes while cancellation is pending", () => {
    const ready = {
      selectedModelId: "model-a",
      isDownloaded: true,
      isDownloading: false,
      isVerifying: false,
      isExtracting: false,
      hasStarted: false,
    };

    expect(
      shouldStartOnboardingSelection({
        ...ready,
        cancellingModelId: "model-a",
      }),
    ).toBe(false);
    expect(
      shouldStartOnboardingSelection({ ...ready, cancellingModelId: null }),
    ).toBe(true);
  });
});
