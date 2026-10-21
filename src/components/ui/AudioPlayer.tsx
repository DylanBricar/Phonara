import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Play, Pause } from "lucide-react";

const revokeBlobSource = (src: string | null) => {
  if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
};

interface AudioPlayerProps {
  src?: string;
  onLoadRequest?: () => Promise<string | null>;
  className?: string;
  autoPlay?: boolean;
}

interface AudioPlayerGroupContextValue {
  requestPlayback: (audio: HTMLAudioElement) => void;
  releasePlayback: (audio: HTMLAudioElement) => void;
}

const AudioPlayerGroupContext =
  createContext<AudioPlayerGroupContextValue | null>(null);

export const AudioPlayerGroup: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const value = useMemo<AudioPlayerGroupContextValue>(
    () => ({
      requestPlayback: (audio) => {
        if (activeAudioRef.current !== audio) activeAudioRef.current?.pause();
        activeAudioRef.current = audio;
      },
      releasePlayback: (audio) => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
      },
    }),
    [],
  );

  return (
    <AudioPlayerGroupContext.Provider value={value}>
      {children}
    </AudioPlayerGroupContext.Provider>
  );
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src: initialSrc,
  onLoadRequest,
  className = "",
  autoPlay = false,
}) => {
  const group = useContext(AudioPlayerGroupContext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sourceIdentity = useMemo(
    () => ({ initialSrc, onLoadRequest }),
    [initialSrc, onLoadRequest],
  );
  const currentIdentityRef = useRef(sourceIdentity);
  currentIdentityRef.current = sourceIdentity;
  const [loadedSource, setLoadedSource] = useState({
    identity: sourceIdentity,
    src: initialSrc ?? null,
    requested: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const lifecycleRef = useRef<{
    identity: typeof sourceIdentity;
    active: boolean;
    ownedSources: Set<string>;
  } | null>(null);
  const src =
    loadedSource.identity === sourceIdentity
      ? loadedSource.src
      : (initialSrc ?? null);
  const animationRef = useRef<number | undefined>(undefined);
  const dragTimeRef = useRef<number>(0);

  const isPlayingRef = useRef(false);
  const isDraggingRef = useRef(false);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    const lifecycle = {
      identity: sourceIdentity,
      active: true,
      ownedSources: new Set(
        initialSrc?.startsWith("blob:") ? [initialSrc] : [],
      ),
    };
    lifecycleRef.current = lifecycle;
    if (initialSrc) audio?.setAttribute("src", initialSrc);
    setLoadedSource({
      identity: sourceIdentity,
      src: initialSrc ?? null,
      requested: false,
    });
    setIsLoading(false);
    setIsPlaying(false);
    setIsDragging(false);
    setCurrentTime(0);
    setDuration(0);

    return () => {
      lifecycle.active = false;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
      // StrictMode immediately replays setup. Transfer a supplied Blob to that
      // new lifecycle instead of revoking a source it still needs to read.
      queueMicrotask(() => {
        const current = lifecycleRef.current;
        for (const ownedSrc of lifecycle.ownedSources) {
          if (!current?.active || !current.ownedSources.has(ownedSrc)) {
            revokeBlobSource(ownedSrc);
          }
        }
        lifecycle.ownedSources.clear();
      });
    };
  }, [sourceIdentity, initialSrc]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const tick = useCallback(() => {
    if (audioRef.current && !isDraggingRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
    }

    if (isPlayingRef.current) {
      animationRef.current = requestAnimationFrame(tick);
    }
  }, []);

  useEffect(() => {
    if (isPlaying && !isDragging) {
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(tick);
      }
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [isPlaying, isDragging, tick]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (!lifecycleRef.current?.active) return;
      setDuration(audio.duration || 0);
      setCurrentTime(0);
    };

    const handleEnded = () => {
      if (!lifecycleRef.current?.active) return;
      group?.releasePlayback(audio);
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    const handlePlay = () => {
      if (!lifecycleRef.current?.active) return;
      group?.requestPlayback(audio);
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (!lifecycleRef.current?.active) return;
      group?.releasePlayback(audio);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      group?.releasePlayback(audio);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, [group]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (
      src &&
      (autoPlay ||
        (loadedSource.identity === sourceIdentity && loadedSource.requested))
    ) {
      let active = true;
      const playWhenReady = () => {
        if (active) audio.play().catch(() => {});
        audio.removeEventListener("canplay", playWhenReady);
      };
      audio.addEventListener("canplay", playWhenReady);
      audio.load();
      return () => {
        active = false;
        audio.removeEventListener("canplay", playWhenReady);
      };
    }
  }, [src, autoPlay, sourceIdentity, loadedSource]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (audioRef.current) {
        audioRef.current.currentTime = dragTimeRef.current;
        setCurrentTime(dragTimeRef.current);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);

      return () => {
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    const lifecycle = lifecycleRef.current;
    if (!audio || !lifecycle?.active) return;
    if (isLoading) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        if (!src && onLoadRequest) {
          setIsLoading(true);
          try {
            const newSrc = await onLoadRequest();
            if (
              !lifecycle.active ||
              currentIdentityRef.current !== lifecycle.identity ||
              audioRef.current !== audio
            ) {
              revokeBlobSource(newSrc);
              return;
            }
            if (newSrc) {
              // Take ownership before React commits state, so unmounting in
              // this microtask cannot leak a resolved file's Blob URL.
              if (newSrc.startsWith("blob:"))
                lifecycle.ownedSources.add(newSrc);
              setLoadedSource({
                identity: lifecycle.identity,
                src: newSrc,
                requested: true,
              });
            }
          } finally {
            if (
              lifecycle.active &&
              currentIdentityRef.current === lifecycle.identity
            ) {
              setIsLoading(false);
            }
          }
        } else if (src) {
          await audio.play();
        }
      }
    } catch {}
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    dragTimeRef.current = newTime;
    setCurrentTime(newTime);

    if (!isDragging && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsDragging(true);
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return "0:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercent = (): number => {
    if (duration <= 0) return 0;

    if (duration - currentTime < 0.1) return 100;

    const percent = (currentTime / duration) * 100;
    return Math.min(100, Math.max(0, percent));
  };

  const progressPercent = getProgressPercent();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" />

      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="transition-colors cursor-pointer text-text hover:text-logo-primary disabled:opacity-50"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause width={20} height={20} fill="currentColor" />
        ) : (
          <Play width={20} height={20} fill="currentColor" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-text/60 min-w-[30px] tabular-nums">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSliderMouseDown}
          onTouchStart={handleSliderTouchStart}
          className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-logo-primary ${progressPercent >= 99.5 ? "[&::-webkit-slider-thumb]:translate-x-0.5 [&::-moz-range-thumb]:translate-x-0.5" : ""}`}
          style={{
            background: `linear-gradient(to right, var(--color-logo-primary) 0%, var(--color-logo-primary) ${progressPercent}%, rgba(128, 128, 128, 0.2) ${progressPercent}%, rgba(128, 128, 128, 0.2) 100%)`,
          }}
        />

        <span className="text-xs text-text/60 min-w-[30px] tabular-nums">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
