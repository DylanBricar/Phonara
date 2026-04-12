import { listen } from "@tauri-apps/api/event";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const isValidHexColor = (v: string): boolean => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

interface ShowOverlayPayload {
  state: OverlayState;
  highVisibility?: boolean;
  borderColor?: string | null;
  backgroundColor?: string | null;
  borderWidth?: number;
  customWidth?: number;
  customHeight?: number;
}

interface ActionInfo {
  key: number;
  name: string;
}

const MicIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.8)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const DotsIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.7)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.5)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const PauseIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="rgba(255,255,255,0.6)"
    stroke="none"
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const PlayIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="rgba(255,255,255,0.6)"
    stroke="none"
  >
    <polygon points="6,4 20,12 6,20" />
  </svg>
);

const formatTime = (s: number) => {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const TimerDisplay: React.FC<{ startTime: number; isPaused: boolean }> = ({
  startTime,
  isPaused,
}) => {
  const [display, setDisplay] = useState("0:00");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isPaused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDisplay(formatTime(elapsed));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startTime, isPaused]);

  return <div className="timer-text">{display}</div>;
};

const NUM_BARS = 13;

const AudioBars: React.FC = () => {
  const barsRef = useRef<HTMLDivElement>(null);
  const smoothedRef = useRef<number[]>(Array(25).fill(0));

  useEffect(() => {
    let isMounted = true;
    let unlisten: (() => void) | null = null;

    (async () => {
      const unlistenFn = await listen<number[]>("mic-level", (event) => {
        if (!isMounted) return;
        const newLevels = event.payload;
        const smoothed = smoothedRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.65 + target * 0.35;
        });
        smoothedRef.current = smoothed;

        if (barsRef.current) {
          const bars = barsRef.current.children;
          const half = Math.ceil(NUM_BARS / 2);
          for (let i = 0; i < NUM_BARS; i++) {
            const bucketIdx = i < half ? i : NUM_BARS - 1 - i;
            const v = smoothed[bucketIdx] || 0;
            const el = bars[i] as HTMLElement;
            el.style.height = `${Math.min(24, 2 + Math.pow(v, 0.6) * 22)}px`;
            el.style.opacity = `${Math.max(0.2, v * 1.4)}`;
          }
        }
      });

      if (isMounted) {
        unlisten = unlistenFn;
      } else {
        unlistenFn();
      }
    })();

    return () => {
      isMounted = false;
      unlisten?.();
    };
  }, []);

  return (
    <div className="bars-container" ref={barsRef}>
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <div key={i} className="bar" />
      ))}
    </div>
  );
};

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [timerStart, setTimerStart] = useState(0);
  const [selectedAction, setSelectedAction] = useState<ActionInfo | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [customStyle, setCustomStyle] = useState<Record<string, string>>({});
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseStartRef = useRef<number>(0);
  const direction = getLanguageDirection(i18n.language);

  const handleCancel = useCallback(() => {
    commands.cancelOperation();
  }, []);

  const handleTogglePause = useCallback(() => {
    commands.togglePause();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanupListeners: (() => void) | undefined;

    const setupEventListeners = async () => {
      const [
        unlistenShow,
        unlistenHide,
        unlistenCancelPending,
        unlistenAction,
        unlistenDeselect,
        unlistenPause,
      ] = await Promise.all([
        listen<ShowOverlayPayload>("show-overlay", async (event) => {
          await syncLanguageFromSettings();
          const payload = event.payload;
          const overlayState = typeof payload === "string" ? payload as OverlayState : payload.state;
          setState(overlayState);
          const styles: Record<string, string> = {};
          if (typeof payload === "object") {
            if (payload.borderColor && isValidHexColor(payload.borderColor))
              styles["--overlay-border-color"] = payload.borderColor;
            if (payload.backgroundColor && isValidHexColor(payload.backgroundColor))
              styles["--overlay-bg"] = payload.backgroundColor;
            if (typeof payload.borderWidth === "number" && payload.borderWidth >= 0 && payload.borderWidth <= 10)
              styles["--overlay-border-width"] = `${payload.borderWidth}px`;
            if (payload.customWidth && payload.customWidth >= 120 && payload.customWidth <= 500)
              styles["--overlay-width"] = `${payload.customWidth}px`;
            if (payload.customHeight && payload.customHeight >= 30 && payload.customHeight <= 80)
              styles["--overlay-height"] = `${payload.customHeight}px`;
          }
          setCustomStyle(styles);
          setIsVisible(true);
          setIsPaused(false);
          if (overlayState === "recording") {
            setTimerStart(Date.now());
            setSelectedAction(null);
          }
        }),
        listen("hide-overlay", () => {
          setIsVisible(false);
          setSelectedAction(null);
          setCancelPending(false);
          setIsPaused(false);
          if (cancelTimerRef.current) {
            clearTimeout(cancelTimerRef.current);
            cancelTimerRef.current = null;
          }
        }),
        listen("cancel-pending", () => {
          setCancelPending(true);
          if (cancelTimerRef.current) {
            clearTimeout(cancelTimerRef.current);
          }
          cancelTimerRef.current = setTimeout(() => {
            setCancelPending(false);
            cancelTimerRef.current = null;
          }, 1700);
        }),
        listen<ActionInfo>("action-selected", (event) => {
          setSelectedAction(event.payload);
        }),
        listen("action-deselected", () => {
          setSelectedAction(null);
        }),
        listen<boolean>("recording-paused", (event) => {
          const paused = event.payload;
          setIsPaused(paused);
          if (paused) {
            pauseStartRef.current = Date.now();
          } else {
            const pauseDuration = Date.now() - pauseStartRef.current;
            setTimerStart((prev) => prev + pauseDuration);
          }
        }),
      ]);

      if (!isMounted) {
        unlistenShow();
        unlistenHide();
        unlistenCancelPending();
        unlistenAction();
        unlistenDeselect();
        unlistenPause();
        return;
      }

      cleanupListeners = () => {
        unlistenShow();
        unlistenHide();
        unlistenCancelPending();
        unlistenAction();
        unlistenDeselect();
        unlistenPause();
      };
    };

    setupEventListeners();
    return () => {
      isMounted = false;
      cleanupListeners?.();
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      dir={direction}
      style={customStyle}
      className={`recording-overlay state-${state} ${isVisible ? "is-visible" : "is-hidden"}`}
    >
      <div className="overlay-left">
        {state === "recording" ? <MicIcon /> : <DotsIcon />}
      </div>

      {selectedAction && state === "recording" && (
        <div className="action-badge">{selectedAction.key}</div>
      )}

      <div className="overlay-middle">
        {state === "recording" && !cancelPending && (
          <>
            <TimerDisplay startTime={timerStart} isPaused={isPaused} />
            <AudioBars />
          </>
        )}
        {state === "recording" && cancelPending && (
          <div className="cancel-confirm-text">
            {t("overlay.cancelConfirm")}
          </div>
        )}
        {state === "transcribing" && (
          <div className="transcribing-text">{t("overlay.transcribing")}</div>
        )}
        {state === "processing" && (
          <div className="transcribing-text">{t("overlay.processing")}</div>
        )}
      </div>

      <div className="overlay-right">
        {state === "recording" && (
          <>
            <button
              className="pause-button"
              onClick={handleTogglePause}
              aria-label={isPaused ? t("overlay.resume") : t("overlay.pause")}
            >
              {isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button
              className="cancel-button"
              onClick={handleCancel}
              aria-label={t("overlay.cancel")}
            >
              <XIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;
