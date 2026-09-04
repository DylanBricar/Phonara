export type OverlayState =
  "recording" | "streaming" | "transcribing" | "processing";

export interface OverlayPresentationPayload {
  state: OverlayState;
  borderColor?: string | null;
  backgroundColor?: string | null;
  borderWidth?: number;
  customWidth?: number;
  customHeight?: number;
}

export const OVERLAY_LIMITS = {
  borderWidth: { min: 0, default: 1, max: 2 },
  liveWidth: { min: 280, default: 352, max: 460 },
  controlHeight: { min: 34, default: 36, max: 42 },
} as const;

const isValidHexColor = (value: string): boolean =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Converts persisted customization into bounded overlay tokens.
 *
 * The compact listening and working pills intentionally keep their intrinsic
 * widths. A user-selected width belongs to the expanded transcript panel; using
 * it for every state creates a large empty bar over the active application.
 */
export const buildOverlayStyle = (
  payload: OverlayPresentationPayload,
): Record<string, string> => {
  const style: Record<string, string> = {};

  if (payload.borderColor && isValidHexColor(payload.borderColor)) {
    style["--s-border"] =
      `color-mix(in srgb, ${payload.borderColor} 52%, transparent)`;
  }

  if (payload.backgroundColor && isValidHexColor(payload.backgroundColor)) {
    style["--s-surface"] =
      `color-mix(in srgb, ${payload.backgroundColor} 94%, transparent)`;
  }

  if (
    typeof payload.borderWidth === "number" &&
    payload.borderWidth >= 0 &&
    payload.borderWidth <= 10
  ) {
    style["--phonara-border-width"] =
      `${Math.min(payload.borderWidth, OVERLAY_LIMITS.borderWidth.max)}px`;
  }

  if (
    typeof payload.customWidth === "number" &&
    payload.customWidth >= 120 &&
    payload.customWidth <= 500
  ) {
    style["--ov-open-w"] =
      `${clamp(payload.customWidth, OVERLAY_LIMITS.liveWidth.min, OVERLAY_LIMITS.liveWidth.max)}px`;
  }

  if (
    typeof payload.customHeight === "number" &&
    payload.customHeight >= 30 &&
    payload.customHeight <= 120
  ) {
    style["--ov-base-h"] =
      `${clamp(payload.customHeight, OVERLAY_LIMITS.controlHeight.min, OVERLAY_LIMITS.controlHeight.max)}px`;
  }

  return style;
};
