export const canCancelOnboardingDownload = (
  selectedModelId: string | null,
  modelId: string,
): boolean => selectedModelId === null || selectedModelId === modelId;

export const selectedModelAfterCancellation = (
  selectedModelId: string | null,
  cancelledModelId: string,
  succeeded: boolean,
): string | null =>
  succeeded && selectedModelId === cancelledModelId ? null : selectedModelId;

export const shouldStartOnboardingSelection = ({
  selectedModelId,
  cancellingModelId,
  isDownloaded,
  isDownloading,
  isVerifying,
  isExtracting,
  hasStarted,
}: {
  selectedModelId: string | null;
  cancellingModelId: string | null;
  isDownloaded: boolean;
  isDownloading: boolean;
  isVerifying: boolean;
  isExtracting: boolean;
  hasStarted: boolean;
}): boolean =>
  selectedModelId !== null &&
  cancellingModelId !== selectedModelId &&
  isDownloaded &&
  !isDownloading &&
  !isVerifying &&
  !isExtracting &&
  !hasStarted;
